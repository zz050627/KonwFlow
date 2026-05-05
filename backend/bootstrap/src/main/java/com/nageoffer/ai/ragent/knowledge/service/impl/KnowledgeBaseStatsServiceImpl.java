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

package com.nageoffer.ai.ragent.knowledge.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeChunkDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeDocumentDO;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeChunkMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeDocumentMapper;
import com.nageoffer.ai.ragent.knowledge.dto.KnowledgeBaseStats;
import com.nageoffer.ai.ragent.knowledge.service.KnowledgeBaseStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeBaseStatsServiceImpl implements KnowledgeBaseStatsService {

    private static final String STATS_KEY_PREFIX = "kb:stats:";
    private static final String HOT_CHUNKS_KEY = ":hot";

    private final KnowledgeDocumentMapper documentMapper;
    private final KnowledgeChunkMapper chunkMapper;
    private final StringRedisTemplate redisTemplate;

    @Override
    public KnowledgeBaseStats getStats(String kbId) {
        Long docCount = documentMapper.selectCount(
                Wrappers.lambdaQuery(KnowledgeDocumentDO.class)
                        .eq(KnowledgeDocumentDO::getKbId, kbId)
                        .eq(KnowledgeDocumentDO::getDeleted, 0)
        );

        Long chunkCount = chunkMapper.selectCount(
                Wrappers.lambdaQuery(KnowledgeChunkDO.class)
                        .eq(KnowledgeChunkDO::getKbId, kbId)
                        .eq(KnowledgeChunkDO::getDeleted, 0)
        );

        Set<String> hotChunkIds = redisTemplate.opsForZSet()
                .reverseRange(STATS_KEY_PREFIX + kbId + HOT_CHUNKS_KEY, 0, 9);

        List<KnowledgeBaseStats.HotChunk> hotChunks = hotChunkIds == null ? List.of() :
                hotChunkIds.stream().map(chunkId -> {
                    Double score = redisTemplate.opsForZSet()
                            .score(STATS_KEY_PREFIX + kbId + HOT_CHUNKS_KEY, chunkId);
                    KnowledgeChunkDO chunk = chunkMapper.selectById(chunkId);
                    return KnowledgeBaseStats.HotChunk.builder()
                            .chunkId(chunkId)
                            .content(chunk != null ? chunk.getContent() : "")
                            .hitCount(score != null ? score.longValue() : 0L)
                            .build();
                }).collect(Collectors.toList());

        return KnowledgeBaseStats.builder()
                .kbId(kbId)
                .totalDocs(docCount)
                .totalChunks(chunkCount)
                .hotChunks(hotChunks)
                .build();
    }

    @Override
    public void recordRetrieval(String kbId, String chunkId, double score) {
        redisTemplate.opsForZSet().incrementScore(STATS_KEY_PREFIX + kbId + HOT_CHUNKS_KEY, chunkId, 1);
    }
}
