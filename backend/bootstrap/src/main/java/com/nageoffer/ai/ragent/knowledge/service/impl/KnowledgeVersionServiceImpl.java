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

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.nageoffer.ai.ragent.framework.context.UserContext;
import com.nageoffer.ai.ragent.framework.exception.ClientException;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeDocumentDO;
import com.nageoffer.ai.ragent.knowledge.dao.entity.KnowledgeVersionDO;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeDocumentMapper;
import com.nageoffer.ai.ragent.knowledge.dao.mapper.KnowledgeVersionMapper;
import com.nageoffer.ai.ragent.knowledge.dto.KnowledgeVersionVO;
import com.nageoffer.ai.ragent.knowledge.service.KnowledgeBaseExportService;
import com.nageoffer.ai.ragent.knowledge.service.KnowledgeVersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeVersionServiceImpl implements KnowledgeVersionService {

    private final KnowledgeVersionMapper versionMapper;
    private final KnowledgeDocumentMapper docMapper;
    private final KnowledgeBaseExportService exportService;

    @Override
    @Transactional
    public String createSnapshot(String kbId, String versionTag, String description) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        exportService.exportToJson(kbId, baos);

        Long docCount = docMapper.selectCount(Wrappers.lambdaQuery(KnowledgeDocumentDO.class)
                .eq(KnowledgeDocumentDO::getKbId, kbId).eq(KnowledgeDocumentDO::getDeleted, 0));

        KnowledgeVersionDO version = KnowledgeVersionDO.builder()
                .kbId(kbId)
                .versionTag(versionTag)
                .description(description)
                .snapshotPath(baos.toString())
                .docCount(docCount)
                .createdBy(UserContext.getUsername())
                .build();

        versionMapper.insert(version);
        log.info("创建知识库快照: kbId={}, version={}", kbId, versionTag);
        return version.getId();
    }

    @Override
    @Transactional
    public void rollback(String kbId, String versionId) {
        KnowledgeVersionDO version = versionMapper.selectById(versionId);
        if (version == null || !version.getKbId().equals(kbId)) {
            throw new ClientException("版本不存在");
        }

        ByteArrayInputStream bais = new ByteArrayInputStream(version.getSnapshotPath().getBytes());
        exportService.importFromJson(bais, kbId);
        log.info("回滚知识库: kbId={}, versionId={}", kbId, versionId);
    }

    @Override
    public List<KnowledgeVersionVO> listVersions(String kbId) {
        return versionMapper.selectList(
                Wrappers.lambdaQuery(KnowledgeVersionDO.class)
                        .eq(KnowledgeVersionDO::getKbId, kbId)
                        .eq(KnowledgeVersionDO::getDeleted, 0)
                        .orderByDesc(KnowledgeVersionDO::getCreateTime)
        ).stream().map(v -> BeanUtil.toBean(v, KnowledgeVersionVO.class))
                .collect(Collectors.toList());
    }
}
