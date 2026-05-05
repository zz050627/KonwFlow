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

package com.nageoffer.ai.ragent.knowledge.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.nageoffer.ai.ragent.knowledge.dao.entity.FileMetadataDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 文件元数据 Mapper
 */
@Mapper
public interface FileMetadataMapper extends BaseMapper<FileMetadataDO> {

    /**
     * 根据文件URL查询文件元数据
     */
    @Select("SELECT * FROM t_file_metadata WHERE file_url = #{fileUrl} AND deleted = 0 LIMIT 1")
    FileMetadataDO selectByFileUrl(@Param("fileUrl") String fileUrl);

    /**
     * 根据知识库ID查询文件列表
     */
    @Select("SELECT * FROM t_file_metadata WHERE kb_id = #{kbId} AND deleted = 0 ORDER BY create_time DESC")
    List<FileMetadataDO> selectByKbId(@Param("kbId") String kbId);

    /**
     * 根据分类查询文件列表
     */
    @Select("SELECT * FROM t_file_metadata WHERE kb_id = #{kbId} AND category = #{category} AND deleted = 0 ORDER BY create_time DESC")
    List<FileMetadataDO> selectByCategory(@Param("kbId") String kbId, @Param("category") String category);
}
