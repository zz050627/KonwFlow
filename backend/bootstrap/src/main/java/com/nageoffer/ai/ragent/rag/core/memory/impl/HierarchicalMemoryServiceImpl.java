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

package com.nageoffer.ai.ragent.rag.core.memory.impl;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nageoffer.ai.ragent.framework.convention.ChatMessage;
import com.nageoffer.ai.ragent.rag.core.memory.HierarchicalMemory;
import com.nageoffer.ai.ragent.rag.core.memory.HierarchicalMemoryService;
import com.nageoffer.ai.ragent.rag.dao.entity.UserProfileDO;
import com.nageoffer.ai.ragent.rag.dao.mapper.UserProfileMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class HierarchicalMemoryServiceImpl implements HierarchicalMemoryService {

    private static final String SHORT_TERM_KEY = "memory:short:";
    private static final String MID_TERM_KEY = "memory:mid:";
    private static final int SHORT_TERM_TTL = 30;
    private static final int MID_TERM_TTL = 7;

    private final StringRedisTemplate redisTemplate;
    private final UserProfileMapper profileMapper;
    private final ObjectMapper objectMapper;

    @Override
    public HierarchicalMemory load(String conversationId, String userId) {
        List<ChatMessage> shortTerm = loadShortTerm(conversationId);
        String midTerm = loadMidTerm(conversationId);
        HierarchicalMemory.UserProfile longTerm = loadLongTerm(userId);

        return HierarchicalMemory.builder()
                .shortTerm(shortTerm)
                .midTermSummary(midTerm)
                .longTerm(longTerm)
                .build();
    }

    @Override
    public void updateShortTerm(String conversationId, String userId, String message) {
        try {
            String key = SHORT_TERM_KEY + conversationId;
            String json = redisTemplate.opsForValue().get(key);
            List<ChatMessage> messages = json != null
                    ? objectMapper.readValue(json, new TypeReference<List<ChatMessage>>() {})
                    : List.of();

            messages.add(ChatMessage.user(message));
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(messages),
                    SHORT_TERM_TTL, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.error("更新短期记忆失败", e);
        }
    }

    @Override
    public void updateMidTerm(String conversationId, String userId, String summary) {
        redisTemplate.opsForValue().set(MID_TERM_KEY + conversationId, summary,
                MID_TERM_TTL, TimeUnit.DAYS);
    }

    @Override
    public void updateLongTerm(String userId, HierarchicalMemory.UserProfile profile) {
        UserProfileDO existing = profileMapper.selectOne(
                Wrappers.lambdaQuery(UserProfileDO.class).eq(UserProfileDO::getUserId, userId));

        if (existing != null) {
            BeanUtil.copyProperties(profile, existing);
            profileMapper.updateById(existing);
        } else {
            UserProfileDO newProfile = new UserProfileDO();
            BeanUtil.copyProperties(profile, newProfile);
            newProfile.setUserId(userId);
            profileMapper.insert(newProfile);
        }
    }

    private List<ChatMessage> loadShortTerm(String conversationId) {
        try {
            String json = redisTemplate.opsForValue().get(SHORT_TERM_KEY + conversationId);
            return json != null ? objectMapper.readValue(json, new TypeReference<List<ChatMessage>>() {}) : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    private String loadMidTerm(String conversationId) {
        return redisTemplate.opsForValue().get(MID_TERM_KEY + conversationId);
    }

    private HierarchicalMemory.UserProfile loadLongTerm(String userId) {
        UserProfileDO profile = profileMapper.selectOne(
                Wrappers.lambdaQuery(UserProfileDO.class).eq(UserProfileDO::getUserId, userId));
        return profile != null ? BeanUtil.toBean(profile, HierarchicalMemory.UserProfile.class) : null;
    }
}
