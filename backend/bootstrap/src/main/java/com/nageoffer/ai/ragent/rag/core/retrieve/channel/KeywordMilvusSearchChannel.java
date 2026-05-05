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

package com.nageoffer.ai.ragent.rag.core.retrieve.channel;

import cn.hutool.core.collection.CollUtil;
import com.nageoffer.ai.ragent.framework.convention.RetrievedChunk;
import com.nageoffer.ai.ragent.infra.keyword.KeywordExtractor;
import io.milvus.v2.client.MilvusClientV2;
import io.milvus.v2.service.vector.request.QueryReq;
import io.milvus.v2.service.vector.response.QueryResp;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Milvus 关键词检索通道
 * <p>
 * 基于关键词字段进行匹配检索，作为语义检索的补充
 * 优先级低于意图定向检索，高于全局向量检索
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "rag.vector.type", havingValue = "milvus", matchIfMissing = true)
public class KeywordMilvusSearchChannel implements SearchChannel {

    private final KeywordExtractor keywordExtractor;
    private final MilvusClientV2 milvusClient;

    @Override
    public String getName() {
        return "KeywordMilvusSearch";
    }

    @Override
    public int getPriority() {
        return 2;  // 优先级：意图定向(1) > 关键词(2) > 全局向量(3)
    }

    @Override
    public boolean isEnabled(SearchContext context) {
        // 关键词检索默认启用
        return true;
    }

    @Override
    public SearchChannelResult search(SearchContext context) {
        long startTime = System.currentTimeMillis();

        try {
            // 1. 提取查询关键词
            List<String> keywords = keywordExtractor.extract(context.getMainQuestion());

            if (CollUtil.isEmpty(keywords)) {
                log.warn("未能从查询中提取关键词");
                return buildEmptyResult(startTime);
            }

            log.info("提取到关键词: {}", keywords);

            // 2. 构建 Milvus 过滤表达式
            String filter = buildKeywordFilter(keywords);

            // 3. 获取集合名称（从意图或使用默认）
            String collectionName = extractCollectionName(context);

            // 4. 执行关键词匹配检索
            List<RetrievedChunk> chunks = searchByKeywords(collectionName, filter, context.getTopK());

            // 5. 计算置信度（基于匹配关键词数量）
            double confidence = calculateConfidence(chunks, keywords);

            long latency = System.currentTimeMillis() - startTime;

            log.info("关键词检索完成，检索到 {} 个 Chunk，置信度：{}，耗时 {}ms",
                    chunks.size(), confidence, latency);

            return SearchChannelResult.builder()
                    .channelType(SearchChannelType.KEYWORD_MILVUS)
                    .channelName(getName())
                    .chunks(chunks)
                    .confidence(confidence)
                    .latencyMs(latency)
                    .build();

        } catch (Exception e) {
            log.error("关键词检索失败", e);
            return buildEmptyResult(startTime);
        }
    }

    @Override
    public SearchChannelType getType() {
        return SearchChannelType.KEYWORD_MILVUS;
    }

    /**
     * 构建关键词过滤表达式
     * 使用 OR 逻辑：匹配任意一个关键词即可
     */
    private String buildKeywordFilter(List<String> keywords) {
        return keywords.stream()
                .map(kw -> "keywords like '%" + escapeKeyword(kw) + "%'")
                .collect(Collectors.joining(" or "));
    }

    /**
     * 转义关键词中的特殊字符
     */
    private String escapeKeyword(String keyword) {
        return keyword.replace("'", "\\'")
                .replace("\"", "\\\"");
    }

    /**
     * 从上下文中提取集合名称
     */
    private String extractCollectionName(SearchContext context) {
        // 优先从意图中获取
        if (CollUtil.isNotEmpty(context.getIntents())) {
            // 从第一个意图的 nodeScores 中获取第一个 KB 节点的 collectionName
            for (var intent : context.getIntents()) {
                for (var nodeScore : intent.nodeScores()) {
                    if (nodeScore.getNode() != null && nodeScore.getNode().getCollectionName() != null) {
                        return nodeScore.getNode().getCollectionName();
                    }
                }
            }
        }
        // 使用默认集合
        return "rag_default_store";
    }

    /**
     * 执行关键词查询（使用 QueryReq 纯过滤，不依赖向量）
     */
    private List<RetrievedChunk> searchByKeywords(String collectionName, String filter, int topK) {
        try {
            QueryReq queryReq = QueryReq.builder()
                    .collectionName(collectionName)
                    .filter(filter)
                    .outputFields(List.of("id", "content", "metadata", "keywords"))
                    .limit((long) topK)
                    .build();

            QueryResp queryResp = milvusClient.query(queryReq);

            List<QueryResp.QueryResult> results = queryResp.getQueryResults();
            if (results == null || results.isEmpty()) {
                return List.of();
            }

            return results.stream()
                    .map(r -> {
                        Map<String, Object> entity = r.getEntity();
                        String id = Objects.toString(entity.get("id"), "");
                        String content = Objects.toString(entity.get("content"), "");
                        return RetrievedChunk.builder()
                                .id(id)
                                .text(content)
                                .score(0.5f)  // 关键词匹配没有向量分数，使用固定置信分
                                .build();
                    })
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Milvus 关键词检索失败: collection={}, filter={}", collectionName, filter, e);
            return List.of();
        }
    }

    /**
     * 计算置信度：命中 chunk 数越多置信度越高，上限 0.8
     */
    private double calculateConfidence(List<RetrievedChunk> chunks, List<String> keywords) {
        if (CollUtil.isEmpty(chunks) || CollUtil.isEmpty(keywords)) {
            return 0.0;
        }
        // 命中率：有结果则基础置信 0.5，命中数越多越高
        double ratio = Math.min(1.0, (double) chunks.size() / keywords.size());
        return 0.4 + 0.4 * ratio;  // 范围 [0.4, 0.8]
    }

    private SearchChannelResult buildEmptyResult(long startTime) {
        return SearchChannelResult.builder()
                .channelType(SearchChannelType.KEYWORD_MILVUS)
                .channelName(getName())
                .chunks(List.of())
                .confidence(0.0)
                .latencyMs(System.currentTimeMillis() - startTime)
                .build();
    }
}
