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

package com.nageoffer.ai.ragent.infra.util;

import java.util.regex.Pattern;

/**
 * LLM 输出清理工具类
 */
public final class LLMResponseCleaner {

    private static final Pattern LEADING_CODE_FENCE = Pattern.compile("^```[\\w-]*\\s*\\n?");
    private static final Pattern TRAILING_CODE_FENCE = Pattern.compile("\\n?```\\s*$");

    private LLMResponseCleaner() {
    }

    /**
     * 移除 Markdown 代码块围栏（例如 ```json ... ```）
     */
    public static String stripMarkdownCodeFence(String raw) {
        if (raw == null) {
            return null;
        }
        String cleaned = raw.trim();
        cleaned = LEADING_CODE_FENCE.matcher(cleaned).replaceFirst("");
        cleaned = TRAILING_CODE_FENCE.matcher(cleaned).replaceFirst("");
        return cleaned.trim();
    }

    /**
     * 提取响应文本中的首个 JSON 对象/数组。
     * 用于兼容模型返回「自然语言 + JSON」的场景。
     */
    public static String extractFirstJson(String raw) {
        String cleaned = stripMarkdownCodeFence(raw);
        if (cleaned == null) {
            return null;
        }

        String text = cleaned.trim();
        if (text.isEmpty()) {
            return text;
        }

        int start = findJsonStart(text);
        if (start < 0) {
            return text;
        }

        String extracted = extractBalancedJson(text, start);
        return extracted != null ? extracted.trim() : text;
    }

    private static int findJsonStart(String text) {
        boolean inString = false;
        boolean escaped = false;

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }

            if (c == '"') {
                inString = true;
                continue;
            }
            if (c == '{' || c == '[') {
                return i;
            }
        }
        return -1;
    }

    private static String extractBalancedJson(String text, int start) {
        int braceDepth = 0;
        int bracketDepth = 0;
        boolean inString = false;
        boolean escaped = false;
        boolean started = false;

        for (int i = start; i < text.length(); i++) {
            char c = text.charAt(i);
            if (!started) {
                if (c == '{') {
                    braceDepth = 1;
                    started = true;
                } else if (c == '[') {
                    bracketDepth = 1;
                    started = true;
                } else {
                    continue;
                }
                continue;
            }

            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }

            if (c == '"') {
                inString = true;
                continue;
            }

            if (c == '{') {
                braceDepth++;
            } else if (c == '}') {
                braceDepth--;
            } else if (c == '[') {
                bracketDepth++;
            } else if (c == ']') {
                bracketDepth--;
            }

            if (braceDepth == 0 && bracketDepth == 0) {
                return text.substring(start, i + 1);
            }
        }
        return null;
    }
}
