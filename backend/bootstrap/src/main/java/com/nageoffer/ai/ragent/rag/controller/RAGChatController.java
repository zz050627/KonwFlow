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

package com.nageoffer.ai.ragent.rag.controller;

import com.nageoffer.ai.ragent.framework.convention.Result;
import com.nageoffer.ai.ragent.framework.idempotent.IdempotentSubmit;
import com.nageoffer.ai.ragent.framework.web.Results;
import com.nageoffer.ai.ragent.rag.service.RAGChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

/**
 * RAG 对话控制器
 * 提供流式问答与任务取消接口
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class RAGChatController {

    private final RAGChatService ragChatService;

    /**
     * 发起 SSE 流式对话
     * 必须返回 SseEmitter，produces 必须指定 text/event-stream
     */
    @IdempotentSubmit(
            key = "T(com.nageoffer.ai.ragent.framework.context.UserContext).getUserId()",
            message = "当前会话处理中，请稍后再发起新的对话"
    )
    @GetMapping(value = "/rag/v3/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestParam String question,
                           @RequestParam(required = false) String conversationId,
                           @RequestParam(required = false, defaultValue = "false") Boolean deepThinking,
                           @RequestParam(required = false) String modelId) {
        SseEmitter emitter = new SseEmitter(0L);
        try {
            ragChatService.streamChat(question, conversationId, deepThinking, modelId, emitter);
        } catch (Exception e) {
            log.error("SSE 流式对话启动失败: question={}, conversationId={}, modelId={}",
                    question, conversationId, modelId, e);
            handleSseError(emitter, e);
        }
        return emitter;
    }

    /**
     * 停止指定任务
     */
    @IdempotentSubmit
    @PostMapping(value = "/rag/v3/stop")
    public Result<Void> stop(@RequestParam String taskId) {
        ragChatService.stopTask(taskId);
        return Results.success();
    }

    /**
     * 处理 SSE 错误
     * 通过 SseEmitter 发送错误事件，不返回 JSON
     */
    private void handleSseError(SseEmitter emitter, Exception e) {
        try {
            String errorMessage = e.getMessage();
            if (errorMessage == null || errorMessage.isEmpty()) {
                errorMessage = "服务器内部错误";
            }

            // 转义 JSON 特殊字符
            String escapedMessage = escapeJson(errorMessage);

            // 发送 SSE 错误事件
            SseEmitter.SseEventBuilder event = SseEmitter.event()
                    .name("error")
                    .data("{\"error\":\"" + escapedMessage + "\"}");
            emitter.send(event);
            emitter.complete();

            log.debug("SSE 错误事件已发送: {}", errorMessage);
        } catch (IOException sendError) {
            log.error("发送 SSE 错误事件失败", sendError);
            emitter.completeWithError(e);
        }
    }

    /**
     * 转义 JSON 字符串
     */
    private String escapeJson(String str) {
        if (str == null) {
            return "";
        }
        return str.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                .replace("\b", "\\b")
                .replace("\f", "\\f");
    }
}

