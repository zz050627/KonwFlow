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

package com.nageoffer.ai.ragent.rag.core.retrieve.strategy;

import com.nageoffer.ai.ragent.framework.convention.RetrievedChunk;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 自适应检索策略：动态调整topK和过滤阈值
 */
@Slf4j
@Component
public class AdaptiveRetrievalStrategy {

    private static final double HIGH_SCORE_THRESHOLD = 0.85;
    private static final double LOW_SCORE_THRESHOLD = 0.60;
    private static final double MIN_ACCEPTABLE_SCORE = 0.50;

    public int calculateDynamicTopK(int baseTopK, String query) {
        int queryLength = query.length();
        if (queryLength < 10) return Math.max(3, baseTopK / 2);
        if (queryLength > 100) return (int) (baseTopK * 1.5);
        return baseTopK;
    }

    public List<RetrievedChunk> filterByAdaptiveThreshold(List<RetrievedChunk> chunks) {
        if (chunks.isEmpty()) return chunks;

        double maxScore = chunks.get(0).getScore();
        double threshold = maxScore > HIGH_SCORE_THRESHOLD ? LOW_SCORE_THRESHOLD : MIN_ACCEPTABLE_SCORE;

        List<RetrievedChunk> filtered = chunks.stream()
                .filter(c -> c.getScore() >= threshold)
                .collect(Collectors.toList());

        log.debug("自适应过滤: maxScore={}, threshold={}, 原始={}, 过滤后={}",
                maxScore, threshold, chunks.size(), filtered.size());
        return filtered;
    }

    public boolean shouldExpandSearch(List<RetrievedChunk> chunks, int requestedTopK) {
        if (chunks.size() < requestedTopK) return false;
        return chunks.stream().allMatch(c -> c.getScore() > HIGH_SCORE_THRESHOLD);
    }
}
