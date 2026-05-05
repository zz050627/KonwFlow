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

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.nageoffer.ai.ragent.knowledge.dao.entity.FileMetadataDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeBaseDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeChunkDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeDocumentDO;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.FileMetadataMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeBaseMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeChunkMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeDocumentMapper;
import com.nageoffer.ai.ragent.knowledge.service.FileMetadataService;
import com.nageoffer.ai.ragent.rag.core.vector.VectorStoreService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 文件元数据服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileMetadataServiceImpl implements FileMetadataService {

    private final FileMetadataMapper fileMetadataMapper;
    private final KnowledgeDocumentMapper documentMapper;
    private final KnowledgeChunkMapper chunkMapper;
    private final KnowledgeBaseMapper knowledgeBaseMapper;
    private final VectorStoreService vectorStoreService;

    @Override
    public void create(FileMetadataDO fileMetadata) {
        fileMetadataMapper.insert(fileMetadata);
    }

    @Override
    public FileMetadataDO getById(String id) {
        return fileMetadataMapper.selectById(id);
    }

    @Override
    public List<FileMetadataDO> listByKbId(String kbId) {
        return fileMetadataMapper.selectByKbId(kbId);
    }

    @Override
    public List<FileMetadataDO> listByCategory(String kbId, String category) {
        return fileMetadataMapper.selectByCategory(kbId, category);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void cascadeDelete(String fileId) {
        // 1. 查询文件元数据
        FileMetadataDO file = fileMetadataMapper.selectById(fileId);
        if (file == null) {
            log.warn("文件不存在: fileId={}", fileId);
            return;
        }

        // 2. 查询关联的文档
        LambdaQueryWrapper<KnowledgeDocumentDO> docQuery = new LambdaQueryWrapper<>();
        docQuery.eq(KnowledgeDocumentDO::getFileUrl, file.getFileUrl());
        List<KnowledgeDocumentDO> docs = documentMapper.selectList(docQuery);

        if (!docs.isEmpty()) {
            List<String> docIds = docs.stream()
                .map(KnowledgeDocumentDO::getId)
                .toList();

            // 3. 删除向量（Milvus/PgVector）- 需要先获取每个文档所属知识库的 collectionName
            for (KnowledgeDocumentDO doc : docs) {
                try {
                    KnowledgeBaseDO kb = knowledgeBaseMapper.selectById(doc.getKbId());
                    if (kb != null) {
                        vectorStoreService.deleteDocumentVectors(kb.getCollectionName(), doc.getId());
                    }
                    log.info("删除文档向量成功: docId={}", doc.getId());
                } catch (Exception e) {
                    log.error("删除文档向量失败: docId={}", doc.getId(), e);
                }
            }

            // 4. 删除数据库记录（chunk -> document）
            LambdaQueryWrapper<KnowledgeChunkDO> chunkQuery = new LambdaQueryWrapper<>();
            chunkQuery.in(KnowledgeChunkDO::getDocId, docIds);
            chunkMapper.delete(chunkQuery);
            log.info("删除文档分块成功: docIds={}", docIds);

            documentMapper.deleteByIds(docIds);
            log.info("删除文档记录成功: docIds={}", docIds);
        }

        // 5. 删除文件元数据
        fileMetadataMapper.deleteById(fileId);
        log.info("删除文件元数据成功: fileId={}", fileId);

        // 注意：物理文件（S3）删除由调用方决定，避免误删共享文件
    }

    @Override
    public String detectCategory(String fileName, String mimeType) {
        if (mimeType == null) {
            mimeType = "";
        }

        // 图片
        if (mimeType.startsWith("image/")) {
            return "image";
        }

        // 视频
        if (mimeType.startsWith("video/")) {
            return "video";
        }

        // 代码文件
        if (fileName != null && fileName.matches(".*\\.(java|py|js|ts|jsx|tsx|cpp|c|h|go|rs|php|rb|swift|kt)$")) {
            return "code";
        }

        // 文档
        if (mimeType.contains("pdf") || mimeType.contains("word") || mimeType.contains("document") ||
            mimeType.contains("text") || mimeType.contains("markdown")) {
            return "document";
        }

        return "other";
    }
}
