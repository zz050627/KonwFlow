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

package com.nageoffer.ai.ragent.knowledge.service;

import com.nageoffer.ai.ragent.knowledge.dao.entity.FileMetadataDO;

import java.util.List;

/**
 * 文件元数据服务
 */
public interface FileMetadataService {

    /**
     * 创建文件元数据
     */
    void create(FileMetadataDO fileMetadata);

    /**
     * 根据ID查询
     */
    FileMetadataDO getById(String id);

    /**
     * 根据知识库ID查询文件列表
     */
    List<FileMetadataDO> listByKbId(String kbId);

    /**
     * 根据分类查询文件列表
     */
    List<FileMetadataDO> listByCategory(String kbId, String category);

    /**
     * 级联删除文件（删除向量、数据库记录、物理文件）
     */
    void cascadeDelete(String fileId);

    /**
     * 检测文件分类
     */
    String detectCategory(String fileName, String mimeType);
}
