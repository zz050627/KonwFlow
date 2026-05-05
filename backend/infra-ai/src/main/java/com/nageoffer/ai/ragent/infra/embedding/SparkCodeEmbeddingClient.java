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
import com.nageoffer.ai.ragent.framework.trace.RagTraceNode;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class SparkCodeEmbeddingClient implements EmbeddingClient {

    private final OkHttpClient httpClient;
    private final Gson gson = new Gson();

    @Override
    public String provider() {
        return ModelProvider.SPARKCODE.getId();
    }

    @Override
    @RagTraceNode(name = "sparkcode-embedding", type = "LLM_PROVIDER")
    public List<Float> embed(String text, ModelTarget target) {
        AIModelProperties.ProviderConfig provider = requireProvider(target);
        JsonObject reqBody = buildRequestBody(text, target);
        Request requestHttp = new Request.Builder()
                .url(resolveUrl(provider, target))
                .post(RequestBody.create(reqBody.toString(), HttpMediaTypes.JSON))
                .addHeader("Content-Type", HttpMediaTypes.JSON_UTF8_HEADER)
                .addHeader("Authorization", "Bearer " + provider.getApiKey())
                .build();

        JsonObject respJson;
        try (Response response = httpClient.newCall(requestHttp).execute()) {
            if (!response.isSuccessful()) {
                String body = readBody(response.body());
                log.warn("SparkCode Embedding 请求失败: status={}, body={}", response.code(), body);
                throw new ModelClientException(
                        "SparkCode Embedding 请求失败: HTTP " + response.code(),
                        classifyStatus(response.code()),
                        response.code()
                );
            }
            respJson = parseJsonBody(response.body());
        } catch (IOException e) {
            throw new ModelClientException("SparkCode Embedding 请求失败: " + e.getMessage(),
                    ModelClientErrorType.NETWORK_ERROR, null, e);
        }

        return extractEmbedding(respJson);
    }

    @Override
    @RagTraceNode(name = "sparkcode-embedding-batch", type = "LLM_PROVIDER")
    public List<List<Float>> embedBatch(List<String> texts, ModelTarget target) {
        AIModelProperties.ProviderConfig provider = requireProvider(target);
        JsonObject reqBody = buildBatchRequestBody(texts, target);
        Request requestHttp = new Request.Builder()
                .url(resolveUrl(provider, target))
                .post(RequestBody.create(reqBody.toString(), HttpMediaTypes.JSON))
                .addHeader("Content-Type", HttpMediaTypes.JSON_UTF8_HEADER)
                .addHeader("Authorization", "Bearer " + provider.getApiKey())
                .build();

        JsonObject respJson;
        try (Response response = httpClient.newCall(requestHttp).execute()) {
            if (!response.isSuccessful()) {
                String body = readBody(response.body());
                log.warn("SparkCode Embedding 批量请求失败: status={}, body={}", response.code(), body);
                throw new ModelClientException(
                        "SparkCode Embedding 批量请求失败: HTTP " + response.code(),
                        classifyStatus(response.code()),
                        response.code()
                );
            }
            respJson = parseJsonBody(response.body());
        } catch (IOException e) {
            throw new ModelClientException("SparkCode Embedding 批量请求失败: " + e.getMessage(),
                    ModelClientErrorType.NETWORK_ERROR, null, e);
        }

        return extractBatchEmbeddings(respJson);
    }

    private JsonObject buildRequestBody(String text, ModelTarget target) {
        JsonObject reqBody = new JsonObject();
        reqBody.addProperty("model", requireModel(target));
        reqBody.addProperty("input", text);
        if (target.candidate() != null && target.candidate().getDimension() != null) {
            reqBody.addProperty("dimensions", target.candidate().getDimension());
        }
        reqBody.addProperty("encoding_format", "float");
        return reqBody;
    }

    private JsonObject buildBatchRequestBody(List<String> texts, ModelTarget target) {
        JsonObject reqBody = new JsonObject();
        reqBody.addProperty("model", requireModel(target));
        JsonArray input = new JsonArray();
        texts.forEach(input::add);
        reqBody.add("input", input);
        if (target.candidate() != null && target.candidate().getDimension() != null) {
            reqBody.addProperty("dimensions", target.candidate().getDimension());
        }
        reqBody.addProperty("encoding_format", "float");
        return reqBody;
    }

    private AIModelProperties.ProviderConfig requireProvider(ModelTarget target) {
        if (target == null || target.provider() == null) {
            throw new IllegalStateException("SparkCode 提供商配置缺失");
        }
        if (target.provider().getApiKey() == null || target.provider().getApiKey().isBlank()) {
            throw new IllegalStateException("SparkCode API密钥缺失");
        }
        return target.provider();
    }

    private String requireModel(ModelTarget target) {
        if (target == null || target.candidate() == null || target.candidate().getModel() == null) {
            throw new IllegalStateException("SparkCode Embedding 模型名称缺失");
        }
        return target.candidate().getModel();
    }

    private JsonObject parseJsonBody(ResponseBody body) throws IOException {
        if (body == null) {
            throw new ModelClientException("SparkCode Embedding 响应为空", ModelClientErrorType.INVALID_RESPONSE, null);
        }
        String content = body.string();
        return gson.fromJson(content, JsonObject.class);
    }

    private String readBody(ResponseBody body) throws IOException {
        if (body == null) {
            return "";
        }
        return new String(body.bytes(), StandardCharsets.UTF_8);
    }

    private String resolveUrl(AIModelProperties.ProviderConfig provider, ModelTarget target) {
        return ModelUrlResolver.resolveUrl(provider, target.candidate(), ModelCapability.EMBEDDING);
    }

    private List<Float> extractEmbedding(JsonObject json) {
        if (json == null || !json.has("data")) {
            throw new ModelClientException("SparkCode Embedding 响应缺少 data", ModelClientErrorType.INVALID_RESPONSE, null);
        }
        JsonArray data = json.getAsJsonArray("data");
        if (data == null || data.isEmpty()) {
            throw new ModelClientException("SparkCode Embedding 响应 data 为空", ModelClientErrorType.INVALID_RESPONSE, null);
        }
        JsonObject item0 = data.get(0).getAsJsonObject();
        if (item0 == null || !item0.has("embedding") || !item0.get("embedding").isJsonArray()) {
            throw new ModelClientException("SparkCode Embedding 响应缺少 embedding", ModelClientErrorType.INVALID_RESPONSE, null);
        }
        JsonArray embedding = item0.getAsJsonArray("embedding");
        List<Float> vector = new ArrayList<>(embedding.size());
        for (int i = 0; i < embedding.size(); i++) {
            vector.add(embedding.get(i).getAsFloat());
        }
        return vector;
    }

    private List<List<Float>> extractBatchEmbeddings(JsonObject json) {
        if (json == null || !json.has("data")) {
            throw new ModelClientException("SparkCode Embedding 响应缺少 data", ModelClientErrorType.INVALID_RESPONSE, null);
        }
        JsonArray data = json.getAsJsonArray("data");
        if (data == null || data.isEmpty()) {
            throw new ModelClientException("SparkCode Embedding 响应 data 为空", ModelClientErrorType.INVALID_RESPONSE, null);
        }
        List<List<Float>> result = new ArrayList<>(data.size());
        for (int i = 0; i < data.size(); i++) {
            JsonObject item = data.get(i).getAsJsonObject();
            if (item == null || !item.has("embedding") || !item.get("embedding").isJsonArray()) {
                throw new ModelClientException("SparkCode Embedding 响应缺少 embedding at index " + i, ModelClientErrorType.INVALID_RESPONSE, null);
            }
            JsonArray embedding = item.getAsJsonArray("embedding");
            List<Float> vector = new ArrayList<>(embedding.size());
            for (int j = 0; j < embedding.size(); j++) {
                vector.add(embedding.get(j).getAsFloat());
            }
            result.add(vector);
        }
        return result;
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
