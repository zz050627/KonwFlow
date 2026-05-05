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

import cn.hutool.crypto.digest.DigestUtil;
import com.nageoffer.ai.ragent.rag.service.NegativeFeedbackService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NegativeFeedbackServiceImpl implements NegativeFeedbackService {

    private static final String NEGATIVE_KEY = "rag:negative:";
    private final StringRedisTemplate redisTemplate;

    @Override
    public void markChunkAsIrrelevant(String chunkId, String query) {
        String key = NEGATIVE_KEY + DigestUtil.md5Hex(query);
        redisTemplate.opsForZSet().incrementScore(key, chunkId, 1);
    }

    @Override
    public double adjustScore(String chunkId, String query, double originalScore) {
        String key = NEGATIVE_KEY + DigestUtil.md5Hex(query);
        Double negativeCount = redisTemplate.opsForZSet().score(key, chunkId);
        if (negativeCount != null && negativeCount > 0) {
            return originalScore * Math.pow(0.9, negativeCount);
        }
        return originalScore;
    }
}
