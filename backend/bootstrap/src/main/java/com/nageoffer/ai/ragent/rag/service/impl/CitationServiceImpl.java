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

package com.nageoffer.ai.ragent.rag.service.impl;

import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeChunkDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeDocumentDO;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeChunkMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeDocumentMapper;
import com.nageoffer.ai.ragent.rag.dto.AnswerWithCitation;
import com.nageoffer.ai.ragent.rag.service.CitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CitationServiceImpl implements CitationService {

    private final KnowledgeChunkMapper chunkMapper;
    private final KnowledgeDocumentMapper docMapper;

    @Override
    public AnswerWithCitation.Citation getChunkDetail(String chunkId) {
        KnowledgeChunkDO chunk = chunkMapper.selectById(chunkId);
        if (chunk == null) return null;

        KnowledgeDocumentDO doc = docMapper.selectById(chunk.getDocId());
        String source = doc != null ? doc.getDocName() : "未知来源";

        return AnswerWithCitation.Citation.builder()
                .chunkId(chunkId)
                .content(chunk.getContent())
                .source(source)
                .build();
    }
}
