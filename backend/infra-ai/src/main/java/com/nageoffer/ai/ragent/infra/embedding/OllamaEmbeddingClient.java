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

package com.nageoffer.ai.ragent.infra.embedding;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
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
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Ollama 本地模型向量嵌入客户端
 * <p>
 * 使用 Ollama 官方 /api/embed 接口（支持批量输入），响应格式：
 * {@code {"embeddings": [[0.1, 0.2, ...], ...]}}
 * 本地服务无需 API Key。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OllamaEmbeddingClient implements EmbeddingClient {

    private final OkHttpClient httpClient;
    private final Gson gson = new Gson();

    @Override
    public String provider() {
        return ModelProvider.OLLAMA.getId();
    }

    @Override
    public List<Float> embed(String text, ModelTarget target) {
        requireProvider(target);
        // /api/embed 支持 input 为字符串或数组，单条直接传字符串
        JsonObject reqBody = new JsonObject();
        reqBody.addProperty("model", requireModel(target));
        reqBody.addProperty("input", text);

        JsonObject respJson = executePost(reqBody, target, "Ollama Embedding");
        return extractFirstEmbedding(respJson);
    }

    @Override
    public List<List<Float>> embedBatch(List<String> texts, ModelTarget target) {
        requireProvider(target);
        // /api/embed 的 input 字段支持字符串数组，一次性批量处理
        JsonObject reqBody = new JsonObject();
        reqBody.addProperty("model", requireModel(target));
        JsonArray inputArray = new JsonArray();
        texts.forEach(inputArray::add);
        reqBody.add("input", inputArray);

        JsonObject respJson = executePost(reqBody, target, "Ollama Embedding Batch");
        return extractAllEmbeddings(respJson);
    }

    // -----------------------------------------------------------------------
    // 请求执行
    // -----------------------------------------------------------------------

    private JsonObject executePost(JsonObject reqBody, ModelTarget target, String opName) {
        String url = ModelUrlResolver.resolveUrl(target.provider(), target.candidate(), ModelCapability.EMBEDDING);
        Request httpRequest = new Request.Builder()
                .url(url)
                .post(RequestBody.create(reqBody.toString(), HttpMediaTypes.JSON))
                .addHeader("Content-Type", HttpMediaTypes.JSON_UTF8_HEADER)
                .build();

        try (Response response = httpClient.newCall(httpRequest).execute()) {
            if (!response.isSuccessful()) {
                String body = readBody(response.body());
                log.warn("{} 请求失败: status={}, body={}", opName, response.code(), body);
                throw new ModelClientException(
                        opName + " 请求失败: HTTP " + response.code(),
                        classifyStatus(response.code()),
                        response.code()
                );
            }
            return parseJsonBody(response.body(), opName);
        } catch (IOException e) {
            throw new ModelClientException(opName + " 请求失败: " + e.getMessage(),
                    ModelClientErrorType.NETWORK_ERROR, null, e);
        }
    }

    // -----------------------------------------------------------------------
    // 响应解析
    // -----------------------------------------------------------------------

    /**
     * 提取批量响应中第一条嵌入向量
     * 响应格式: {"embeddings": [[0.1, 0.2, ...]]}
     */
    private List<Float> extractFirstEmbedding(JsonObject json) {
        List<List<Float>> all = extractAllEmbeddings(json);
        if (all.isEmpty()) {
            throw new ModelClientException("Ollama Embedding 响应为空", ModelClientErrorType.INVALID_RESPONSE, null);
        }
        return all.get(0);
    }

    /**
     * 提取所有嵌入向量
     * 响应格式: {"embeddings": [[...], [...]]}
     */
    private List<List<Float>> extractAllEmbeddings(JsonObject json) {
        if (json == null || !json.has("embeddings")) {
            throw new ModelClientException("Ollama Embedding 响应缺少 embeddings 字段",
                    ModelClientErrorType.INVALID_RESPONSE, null);
        }
        JsonArray embeddings = json.getAsJsonArray("embeddings");
        if (embeddings == null || embeddings.isEmpty()) {
            throw new ModelClientException("Ollama Embedding 响应 embeddings 为空",
                    ModelClientErrorType.INVALID_RESPONSE, null);
        }

        List<List<Float>> result = new ArrayList<>(embeddings.size());
        for (int i = 0; i < embeddings.size(); i++) {
            JsonArray vec = embeddings.get(i).getAsJsonArray();
            List<Float> vector = new ArrayList<>(vec.size());
            for (int j = 0; j < vec.size(); j++) {
                vector.add(vec.get(j).getAsFloat());
            }
            result.add(vector);
        }
        return result;
    }

    // -----------------------------------------------------------------------
    // 辅助方法
    // -----------------------------------------------------------------------

    private void requireProvider(ModelTarget target) {
        if (target == null || target.provider() == null) {
            throw new IllegalStateException("Ollama 提供商配置缺失");
        }
        // 本地 Ollama 服务不需要 API Key
    }

    private String requireModel(ModelTarget target) {
        if (target == null || target.candidate() == null || target.candidate().getModel() == null) {
            throw new IllegalStateException("Ollama Embedding 模型名称缺失");
        }
        return target.candidate().getModel();
    }

    private JsonObject parseJsonBody(ResponseBody body, String opName) throws IOException {
        if (body == null) {
            throw new ModelClientException(opName + " 响应为空", ModelClientErrorType.INVALID_RESPONSE, null);
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
