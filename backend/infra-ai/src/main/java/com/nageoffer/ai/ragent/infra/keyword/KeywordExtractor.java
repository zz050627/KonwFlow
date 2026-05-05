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

package com.nageoffer.ai.ragent.infra.keyword;

import java.util.List;

/**
 * 关键词提取器接口
 * 从文本中提取关键词，用于关键词检索和文档标注
 */
public interface KeywordExtractor {

    /**
     * 从文本中提取关键词
     *
     * @param text 输入文本
     * @return 关键词列表
     */
    List<String> extract(String text);

    /**
     * 从文本中提取指定数量的关键词
     *
     * @param text       输入文本
     * @param maxKeywords 最大关键词数量
     * @return 关键词列表
     */
    List<String> extract(String text, int maxKeywords);
}
