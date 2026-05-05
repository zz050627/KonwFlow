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

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nageoffer.ai.ragent.core.chunk.VectorChunk;
import com.nageoffer.ai.ragent.framework.exception.ClientException;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeBaseDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeChunkDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeDocumentDO;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeBaseMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeChunkMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeDocumentMapper;
import com.nageoffer.ai.ragent.knowledge.dto.KnowledgeBaseExport;
import com.nageoffer.ai.ragent.knowledge.service.KnowledgeBaseExportService;
import com.nageoffer.ai.ragent.rag.core.vector.VectorStoreService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeBaseExportServiceImpl implements KnowledgeBaseExportService {

    private final KnowledgeBaseMapper kbMapper;
    private final KnowledgeDocumentMapper docMapper;
    private final KnowledgeChunkMapper chunkMapper;
    private final VectorStoreService vectorStoreService;
    private final ObjectMapper objectMapper;

    @Override
    public void exportToJson(String kbId, OutputStream outputStream) {
        KnowledgeBaseDO kb = kbMapper.selectById(kbId);
        if (kb == null) throw new ClientException("知识库不存在");

        List<KnowledgeDocumentDO> docs = docMapper.selectList(
                Wrappers.lambdaQuery(KnowledgeDocumentDO.class)
                        .eq(KnowledgeDocumentDO::getKbId, kbId)
                        .eq(KnowledgeDocumentDO::getDeleted, 0)
        );

        KnowledgeBaseExport export = new KnowledgeBaseExport();
        export.setName(kb.getName());
        export.setEmbeddingModel(kb.getEmbeddingModel());
        export.setDocuments(docs.stream().map(doc -> {
            KnowledgeBaseExport.DocumentExport docExport = new KnowledgeBaseExport.DocumentExport();
            docExport.setFileName(doc.getDocName());
            docExport.setFileType(doc.getSourceType());

            List<KnowledgeChunkDO> chunks = chunkMapper.selectList(
                    Wrappers.lambdaQuery(KnowledgeChunkDO.class)
                            .eq(KnowledgeChunkDO::getDocId, doc.getId())
                            .eq(KnowledgeChunkDO::getDeleted, 0)
            );

            docExport.setChunks(chunks.stream().map(chunk -> {
                KnowledgeBaseExport.ChunkExport chunkExport = new KnowledgeBaseExport.ChunkExport();
                chunkExport.setContent(chunk.getContent());
                chunkExport.setKeywords(chunk.getKeywords());
                return chunkExport;
            }).collect(Collectors.toList()));

            return docExport;
        }).collect(Collectors.toList()));

        try {
            objectMapper.writeValue(outputStream, export);
        } catch (Exception e) {
            throw new ClientException("导出失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public String importFromJson(InputStream inputStream, String targetKbId) {
        try {
            KnowledgeBaseExport export = objectMapper.readValue(inputStream, KnowledgeBaseExport.class);
            KnowledgeBaseDO kb = kbMapper.selectById(targetKbId);
            if (kb == null) throw new ClientException("目标知识库不存在");

            for (KnowledgeBaseExport.DocumentExport docExport : export.getDocuments()) {
                KnowledgeDocumentDO doc = new KnowledgeDocumentDO();
                doc.setId(IdUtil.getSnowflakeNextIdStr());
                doc.setKbId(targetKbId);
                doc.setDocName(docExport.getFileName());
                doc.setSourceType(docExport.getFileType());
                doc.setChunkCount(docExport.getChunks().size());
                docMapper.insert(doc);

                List<VectorChunk> chunks = new ArrayList<>();
                for (KnowledgeBaseExport.ChunkExport chunkExport : docExport.getChunks()) {
                    String chunkId = IdUtil.getSnowflakeNextIdStr();
                    KnowledgeChunkDO chunk = new KnowledgeChunkDO();
                    chunk.setId(chunkId);
                    chunk.setKbId(targetKbId);
                    chunk.setDocId(doc.getId());
                    chunk.setContent(chunkExport.getContent());
                    chunk.setKeywords(chunkExport.getKeywords());
                    chunkMapper.insert(chunk);

                    chunks.add(VectorChunk.builder()
                            .chunkId(chunkId)
                            .content(chunkExport.getContent())
                            .keywords(chunkExport.getKeywords())
                            .build());
                }

                vectorStoreService.indexDocumentChunks(kb.getCollectionName(), doc.getId(), chunks);
            }

            return targetKbId;
        } catch (Exception e) {
            throw new ClientException("导入失败: " + e.getMessage());
        }
    }
}
