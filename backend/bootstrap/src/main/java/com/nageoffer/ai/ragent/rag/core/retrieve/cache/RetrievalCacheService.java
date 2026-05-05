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

package com.nageoffer.ai.ragent.rag.core.retrieve.cache;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.DigestUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nageoffer.ai.ragent.framework.convention.RetrievedChunk;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class RetrievalCacheService {

    private static final String CACHE_PREFIX = "rag:retrieval:";
    private static final long CACHE_TTL_MINUTES = 10;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public List<RetrievedChunk> get(String collectionName, String query, int topK) {
        String key = buildKey(collectionName, query, topK);
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (StrUtil.isBlank(json)) return null;
            return objectMapper.readValue(json, new TypeReference<List<RetrievedChunk>>() {});
        } catch (Exception e) {
            log.warn("检索缓存读取失败: {}", e.getMessage());
            return null;
        }
    }

    public void put(String collectionName, String query, int topK, List<RetrievedChunk> chunks) {
        String key = buildKey(collectionName, query, topK);
        try {
            String json = objectMapper.writeValueAsString(chunks);
            redisTemplate.opsForValue().set(key, json, CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.warn("检索缓存写入失败: {}", e.getMessage());
        }
    }

    public void invalidate(String collectionName) {
        redisTemplate.delete(redisTemplate.keys(CACHE_PREFIX + collectionName + ":*"));
    }

    private String buildKey(String collectionName, String query, int topK) {
        String hash = DigestUtil.md5Hex(query);
        return CACHE_PREFIX + collectionName + ":" + hash + ":" + topK;
    }
}
