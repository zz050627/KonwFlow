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
import com.nageoffer.ai.ragent.core.chunk.VectorChunk;
import com.nageoffer.ai.ragent.infra.embedding.EmbeddingService;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeBaseDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeChunkDO;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeBaseMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeChunkMapper;
import com.nageoffer.ai.ragent.knowledge.service.MultiModelMigrationService;
import com.nageoffer.ai.ragent.rag.core.vector.VectorStoreService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MultiModelMigrationServiceImpl implements MultiModelMigrationService {

    private static final String MIGRATION_KEY = "kb:migration:";
    private final KnowledgeBaseMapper kbMapper;
    private final KnowledgeChunkMapper chunkMapper;
    private final EmbeddingService embeddingService;
    private final VectorStoreService vectorStoreService;
    private final StringRedisTemplate redisTemplate;

    @Override
    @Async
    public void startMigration(String kbId, String newModelId) {
        redisTemplate.opsForValue().set(MIGRATION_KEY + kbId, "RUNNING", 24, TimeUnit.HOURS);

        try {
            KnowledgeBaseDO kb = kbMapper.selectById(kbId);
            List<KnowledgeChunkDO> chunks = chunkMapper.selectList(
                    Wrappers.lambdaQuery(KnowledgeChunkDO.class)
                            .eq(KnowledgeChunkDO::getKbId, kbId)
                            .eq(KnowledgeChunkDO::getDeleted, 0)
            );

            int total = chunks.size();
            for (int i = 0; i < total; i++) {
                KnowledgeChunkDO chunk = chunks.get(i);

                VectorChunk vectorChunk = VectorChunk.builder()
                        .chunkId(chunk.getId())
                        .content(chunk.getContent())
                        .keywords(chunk.getKeywords())
                        .build();

                vectorStoreService.updateChunk(kb.getCollectionName(), chunk.getDocId(), vectorChunk);

                if (i % 100 == 0) {
                    redisTemplate.opsForValue().set(MIGRATION_KEY + kbId,
                            String.format("RUNNING:%d/%d", i, total));
                }
            }

            kb.setEmbeddingModel(newModelId);
            kbMapper.updateById(kb);
            redisTemplate.opsForValue().set(MIGRATION_KEY + kbId, "COMPLETED", 1, TimeUnit.HOURS);
            log.info("模型迁移完成: kbId={}, newModel={}", kbId, newModelId);
        } catch (Exception e) {
            redisTemplate.opsForValue().set(MIGRATION_KEY + kbId, "FAILED:" + e.getMessage());
            log.error("模型迁移失败: kbId={}", kbId, e);
        }
    }

    @Override
    public String getMigrationStatus(String kbId) {
        String status = redisTemplate.opsForValue().get(MIGRATION_KEY + kbId);
        return status != null ? status : "IDLE";
    }

    @Override
    public void cancelMigration(String kbId) {
        redisTemplate.delete(MIGRATION_KEY + kbId);
    }
}
