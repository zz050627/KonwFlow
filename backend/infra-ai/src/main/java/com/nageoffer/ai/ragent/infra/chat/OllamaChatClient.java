/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.nageoffer.ai.ragent.infra.chat;

import cn.hutool.core.collection.CollUtil;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.nageoffer.ai.ragent.framework.convention.ChatMessage;
import com.nageoffer.ai.ragent.framework.convention.ChatRequest;
import com.nageoffer.ai.ragent.infra.config.AIModelProperties;
import com.nageoffer.ai.ragent.infra.enums.ModelCapability;
import com.nageoffer.ai.ragent.infra.enums.ModelProvider;
import com.nageoffer.ai.ragent.infra.http.HttpMediaTypes;
import com.nageoffer.ai.ragent.infra.http.ModelClientErrorType;
import com.nageoffer.ai.ragent.infra.http.ModelClientException;
import com.nageoffer.ai.ragent.infra.http.ModelUrlResolver;
import com.nageoffer.ai.ragent.infra.model.ModelTarget;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.Call;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.BufferedSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Ollama 本地模型聊天客户端
 * <p>
 * 使用 Ollama 官方 /api/chat 接口，响应格式为 NDJSON（换行分隔 JSON），
 * 与 OpenAI SSE 格式不同，每行直接是完整 JSON 对象。
 * 本地服务无需 API Key。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OllamaChatClient implements ChatClient {

    private final OkHttpClient httpClient;
    @Qualifier("modelStreamExecutor")
    private final Executor modelStreamExecutor;

    private final Gson gson = new Gson();

    @Override
    public String provider() {
        return ModelProvider.OLLAMA.getId();
    }

    @Override
    public String chat(ChatRequest request, ModelTarget target) {
        requireProvider(target);
        JsonObject reqBody = buildRequestBody(request, target, false);
        Request httpRequest = buildHttpRequest(reqBody, target);

        JsonObject respJson;
        try (Response response = httpClient.newCall(httpRequest).execute()) {
            if (!response.isSuccessful()) {
                String body = readBody(response.body());
                log.warn("Ollama 同步请求失败: status={}, body={}", response.code(), body);
                throw new ModelClientException(
                        "Ollama 同步请求失败: HTTP " + response.code(),
                        classifyStatus(response.code()),
                        response.code()
                );
            }
            respJson = parseJsonBody(response.body());
        } catch (IOException e) {
            throw new ModelClientException("Ollama 同步请求失败: " + e.getMessage(),
                    ModelClientErrorType.NETWORK_ERROR, null, e);
        }

        return extractChatContent(respJson);
    }

    @Override
    public StreamCancellationHandle streamChat(ChatRequest request, StreamCallback callback, ModelTarget target) {
        requireProvider(target);
        Call call = httpClient.newCall(buildHttpRequest(buildRequestBody(request, target, true), target));
        return StreamAsyncExecutor.submit(
                modelStreamExecutor,
                call,
                callback,
                cancelled -> doStream(call, callback, cancelled)
        );
    }

    // -----------------------------------------------------------------------
    // 流式响应处理（NDJSON：每行一个完整 JSON 对象）
    // -----------------------------------------------------------------------

    private void doStream(Call call, StreamCallback callback, AtomicBoolean cancelled) {
        try (Response response = call.execute()) {
            if (!response.isSuccessful()) {
                String body = readBody(response.body());
                throw new ModelClientException(
                        "Ollama 流式请求失败: HTTP " + response.code() + " - " + body,
                        classifyStatus(response.code()),
                        response.code()
                );
            }
            ResponseBody responseBody = response.body();
            if (responseBody == null) {
                throw new ModelClientException("Ollama 流式响应为空", ModelClientErrorType.INVALID_RESPONSE, null);
            }

            BufferedSource source = responseBody.source();
            boolean completed = false;

            while (!cancelled.get()) {
                String line = source.readUtf8Line();
                if (line == null) {
                    break;
                }
                if (line.isBlank()) {
                    continue;
                }

                try {
                    JsonObject chunk = gson.fromJson(line, JsonObject.class);
                    String content = extractStreamContent(chunk);
                    if (content != null && !content.isEmpty()) {
                        callback.onContent(content);
                    }
                    if (isDone(chunk)) {
                        callback.onComplete();
                        completed = true;
                        break;
                    }
                } catch (Exception parseEx) {
                    log.warn("Ollama 流式响应解析失败: line={}", line, parseEx);
                }
            }

            if (!cancelled.get() && !completed) {
                throw new ModelClientException("Ollama 流式响应异常结束", ModelClientErrorType.INVALID_RESPONSE, null);
            }
        } catch (Exception e) {
            callback.onError(e);
        }
    }

    // -----------------------------------------------------------------------
    // 请求构建
    // -----------------------------------------------------------------------

    private JsonObject buildRequestBody(ChatRequest request, ModelTarget target, boolean stream) {
        JsonObject body = new JsonObject();
        body.addProperty("model", requireModel(target));
        body.addProperty("stream", stream);
        body.add("messages", buildMessages(request));

        JsonObject options = buildOptions(request);
        if (options.size() > 0) {
            body.add("options", options);
        }

        return body;
    }

    private JsonArray buildMessages(ChatRequest request) {
        JsonArray arr = new JsonArray();
        List<ChatMessage> messages = request.getMessages();
        if (CollUtil.isNotEmpty(messages)) {
            for (ChatMessage m : messages) {
                JsonObject msg = new JsonObject();
                msg.addProperty("role", toOllamaRole(m.getRole()));
                msg.addProperty("content", m.getContent());
                arr.add(msg);
            }
        }
        return arr;
    }

    /**
     * 将模型参数映射到 Ollama options 对象
     * <ul>
     *   <li>temperature → options.temperature</li>
     *   <li>top_p       → options.top_p</li>
     *   <li>max_tokens  → options.num_predict</li>
     * </ul>
     */
    private JsonObject buildOptions(ChatRequest request) {
        JsonObject options = new JsonObject();
        if (request.getTemperature() != null) {
            options.addProperty("temperature", request.getTemperature());
        }
        if (request.getTopP() != null) {
            options.addProperty("top_p", request.getTopP());
        }
        if (request.getMaxTokens() != null) {
            options.addProperty("num_predict", request.getMaxTokens());
        }
        return options;
    }

    private Request buildHttpRequest(JsonObject reqBody, ModelTarget target) {
        String url = ModelUrlResolver.resolveUrl(target.provider(), target.candidate(), ModelCapability.CHAT);
        return new Request.Builder()
                .url(url)
                .post(RequestBody.create(reqBody.toString(), HttpMediaTypes.JSON))
                .addHeader("Content-Type", HttpMediaTypes.JSON_UTF8_HEADER)
                .build();
    }

    // -----------------------------------------------------------------------
    // 响应解析
    // -----------------------------------------------------------------------

    /**
     * 从 NDJSON 流式分块中提取增量文本内容
     * 格式: {"message": {"role": "assistant", "content": "..."}, "done": false}
     */
    private String extractStreamContent(JsonObject chunk) {
        if (chunk == null || !chunk.has("message")) {
            return null;
        }
        JsonObject message = chunk.getAsJsonObject("message");
        if (message == null || !message.has("content") || message.get("content").isJsonNull()) {
            return null;
        }
        return message.get("content").getAsString();
    }

    private boolean isDone(JsonObject chunk) {
        return chunk != null && chunk.has("done") && chunk.get("done").getAsBoolean();
    }

    /**
     * 从非流式响应中提取完整内容
     * 格式: {"message": {"role": "assistant", "content": "..."}, "done": true}
     */
    private String extractChatContent(JsonObject respJson) {
        if (respJson == null || !respJson.has("message")) {
            throw new ModelClientException("Ollama 响应缺少 message", ModelClientErrorType.INVALID_RESPONSE, null);
        }
        JsonObject message = respJson.getAsJsonObject("message");
        if (message == null || !message.has("content") || message.get("content").isJsonNull()) {
            throw new ModelClientException("Ollama 响应缺少 content", ModelClientErrorType.INVALID_RESPONSE, null);
        }
        return message.get("content").getAsString();
    }

    // -----------------------------------------------------------------------
    // 辅助方法
    // -----------------------------------------------------------------------

    private String toOllamaRole(ChatMessage.Role role) {
        return switch (role) {
            case SYSTEM -> "system";
            case USER -> "user";
            case ASSISTANT -> "assistant";
        };
    }

    private void requireProvider(ModelTarget target) {
        if (target == null || target.provider() == null) {
            throw new IllegalStateException("Ollama 提供商配置缺失");
        }
        // 本地 Ollama 服务不需要 API Key，跳过密钥校验
    }

    private String requireModel(ModelTarget target) {
        if (target == null || target.candidate() == null || target.candidate().getModel() == null) {
            throw new IllegalStateException("Ollama 模型名称缺失");
        }
        return target.candidate().getModel();
    }

    private JsonObject parseJsonBody(ResponseBody body) throws IOException {
        if (body == null) {
            throw new ModelClientException("Ollama 响应为空", ModelClientErrorType.INVALID_RESPONSE, null);
        }
        return gson.fromJson(body.string(), JsonObject.class);
    }

    private String readBody(ResponseBody body) throws IOException {
        if (body == null) {
            return "";
        }
        return new String(body.bytes(), StandardCharsets.UTF_8);
    }

    private ModelClientErrorType classifyStatus(int status) {
        if (status == 401 || status == 403) {
            return ModelClientErrorType.UNAUTHORIZED;
        }
        if (status == 429) {
            return ModelClientErrorType.RATE_LIMITED;
        }
        if (status >= 500) {
            return ModelClientErrorType.SERVER_ERROR;
        }
        return ModelClientErrorType.CLIENT_ERROR;
    }
}
