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

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.nageoffer.ai.ragent.framework.context.UserContext;
import com.nageoffer.ai.ragent.rag.dao.entity.IntentFeedbackDO;
import com.nageoffer.ai.ragent.rag.dao.mapper.IntentFeedbackMapper;
import com.nageoffer.ai.ragent.rag.service.IntentLearningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntentLearningServiceImpl implements IntentLearningService {

    private final IntentFeedbackMapper feedbackMapper;

    @Override
    public void recordFeedback(String query, String predictedIntent, String actualIntent, Double confidence) {
        IntentFeedbackDO feedback = new IntentFeedbackDO();
        feedback.setQuery(query);
        feedback.setPredictedIntent(predictedIntent);
        feedback.setActualIntent(actualIntent);
        feedback.setConfidence(confidence);
        feedback.setUserId(UserContext.getUserId());
        feedbackMapper.insert(feedback);
    }

    @Override
    public void adjustIntentModel() {
        List<IntentFeedbackDO> feedbacks = feedbackMapper.selectList(
                Wrappers.lambdaQuery(IntentFeedbackDO.class)
                        .lt(IntentFeedbackDO::getConfidence, 0.7)
                        .last("LIMIT 100")
        );

        log.info("意图学习：收集到{}条低置信度反馈", feedbacks.size());
    }
}
