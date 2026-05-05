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

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.nageoffer.ai.ragent.core.chunk.VectorChunk;
import com.nageoffer.ai.ragent.framework.exception.ClientException;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeBaseDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeChunkDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeDocumentDO;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeBaseMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeChunkMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeDocumentMapper;
import com.nageoffer.ai.ragent.knowledge.service.DocumentIncrementalUpdateService;
import com.nageoffer.ai.ragent.rag.core.vector.VectorStoreService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentIncrementalUpdateServiceImpl implements DocumentIncrementalUpdateService {

    private final KnowledgeDocumentMapper docMapper;
    private final KnowledgeChunkMapper chunkMapper;
    private final KnowledgeBaseMapper kbMapper;
    private final VectorStoreService vectorStoreService;

    @Override
    @Transactional
    public void updateDocument(String docId, String newContent) {
        KnowledgeDocumentDO doc = docMapper.selectById(docId);
        if (doc == null) throw new ClientException("文档不存在");

        List<String> changedChunkIds = detectChangedChunks(docId, newContent);

        if (changedChunkIds.isEmpty()) {
            log.info("文档无变更，跳过更新: docId={}", docId);
            return;
        }

        log.info("检测到{}个分块需要更新: docId={}", changedChunkIds.size(), docId);

        KnowledgeBaseDO kb = kbMapper.selectById(doc.getKbId());
        for (String chunkId : changedChunkIds) {
            KnowledgeChunkDO chunk = chunkMapper.selectById(chunkId);
            VectorChunk vectorChunk = VectorChunk.builder()
                    .chunkId(chunkId)
                    .content(chunk.getContent())
                    .keywords(chunk.getKeywords())
                    .build();
            vectorStoreService.updateChunk(kb.getCollectionName(), docId, vectorChunk);
        }
    }

    @Override
    public List<String> detectChangedChunks(String docId, String newContent) {
        List<KnowledgeChunkDO> existingChunks = chunkMapper.selectList(
                Wrappers.lambdaQuery(KnowledgeChunkDO.class)
                        .eq(KnowledgeChunkDO::getDocId, docId)
                        .eq(KnowledgeChunkDO::getDeleted, 0)
        );

        Map<Integer, String> existingMap = existingChunks.stream()
                .collect(Collectors.toMap(KnowledgeChunkDO::getChunkIndex, KnowledgeChunkDO::getContent));

        String[] newChunks = splitContent(newContent);
        List<String> changedIds = new ArrayList<>();

        for (int i = 0; i < newChunks.length; i++) {
            String oldContent = existingMap.get(i);
            if (!StrUtil.equals(oldContent, newChunks[i])) {
                if (i < existingChunks.size()) {
                    changedIds.add(existingChunks.get(i).getId());
                }
            }
        }

        return changedIds;
    }

    private String[] splitContent(String content) {
        return content.split("\n\n");
    }
}
