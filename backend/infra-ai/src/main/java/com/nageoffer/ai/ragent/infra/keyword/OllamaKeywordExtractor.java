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

package com.nageoffer.ai.ragent.infra.keyword;

import com.nageoffer.ai.ragent.framework.convention.ChatMessage;
import com.nageoffer.ai.ragent.framework.convention.ChatRequest;
import com.nageoffer.ai.ragent.infra.chat.ChatClient;
import com.nageoffer.ai.ragent.infra.config.AIModelProperties;
import com.nageoffer.ai.ragent.infra.model.ModelSelector;
import com.nageoffer.ai.ragent.infra.model.ModelTarget;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 基于 Ollama 的关键词提取器
 * 使用本地 LLM 模型提取文本关键词
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "ai.keyword", name = "extractor", havingValue = "ollama", matchIfMissing = true)
public class OllamaKeywordExtractor implements KeywordExtractor {

    private final Map<String, ChatClient> chatClientMap;
    private final ModelSelector modelSelector;
    private final AIModelProperties aiModelProperties;

    private static final int DEFAULT_MAX_KEYWORDS = 5;
    private static final String EXTRACTION_PROMPT_TEMPLATE =
        "从以下文本中提取%d个最重要的关键词，用逗号分隔，只返回关键词，不要其他内容：\n\n%s";

    @Override
    public List<String> extract(String text) {
        Integer maxKeywords = aiModelProperties.getKeyword() != null
            ? aiModelProperties.getKeyword().getMaxKeywords()
            : DEFAULT_MAX_KEYWORDS;
        return extract(text, maxKeywords != null ? maxKeywords : DEFAULT_MAX_KEYWORDS);
    }

    @Override
    public List<String> extract(String text, int maxKeywords) {
        if (text == null || text.trim().isEmpty()) {
            return Collections.emptyList();
        }

        // 文本过长时截取前1000字符
        String truncatedText = text.length() > 1000 ? text.substring(0, 1000) : text;

        try {
            // 构建提示词
            String prompt = String.format(EXTRACTION_PROMPT_TEMPLATE, maxKeywords, truncatedText);

            // 获取模型配置
            String modelId = aiModelProperties.getKeyword() != null
                ? aiModelProperties.getKeyword().getModelId()
                : "qwen2.5-ollama";

            ModelTarget target = modelSelector.selectChatCandidates(false, modelId).get(0);
            ChatClient chatClient = chatClientMap.get(target.candidate().getProvider());

            if (chatClient == null) {
                log.warn("关键词提取失败：未找到 provider={} 的 ChatClient", target.candidate().getProvider());
                return Collections.emptyList();
            }

            // 构建请求
            ChatRequest request = new ChatRequest();
            request.setMessages(Collections.singletonList(
                new ChatMessage(ChatMessage.Role.USER, prompt)
            ));
            request.setTemperature(0.3); // 低温度保证稳定输出
            request.setMaxTokens(100);

            // 调用模型
            String response = chatClient.chat(request, target);

            // 解析关键词
            return parseKeywords(response, maxKeywords);

        } catch (Exception e) {
            log.error("关键词提取失败: text={}", truncatedText, e);
            return Collections.emptyList();
        }
    }

    /**
     * 解析模型返回的关键词字符串
     */
    private List<String> parseKeywords(String response, int maxKeywords) {
        if (response == null || response.trim().isEmpty()) {
            return Collections.emptyList();
        }

        // 分割关键词（支持中英文逗号、分号、换行）
        return Arrays.stream(response.split("[,，;；\\n]"))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .filter(s -> s.length() <= 50) // 过滤过长的"关键词"
            .distinct()
            .limit(maxKeywords)
            .collect(Collectors.toList());
    }
}
