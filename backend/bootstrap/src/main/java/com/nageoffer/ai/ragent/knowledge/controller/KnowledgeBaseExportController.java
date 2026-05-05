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

package com.nageoffer.ai.ragent.knowledge.controller;

import com.nageoffer.ai.ragent.framework.convention.Result;
import com.nageoffer.ai.ragent.framework.web.Results;
import com.nageoffer.ai.ragent.knowledge.service.KnowledgeBaseExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@RestController
@RequestMapping("/api/ragent/knowledge/export")
@RequiredArgsConstructor
public class KnowledgeBaseExportController {

    private final KnowledgeBaseExportService exportService;

    @GetMapping("/{kbId}")
    public void export(@PathVariable String kbId, HttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setHeader("Content-Disposition", "attachment; filename=kb_" + kbId + ".json");
        exportService.exportToJson(kbId, response.getOutputStream());
    }

    @PostMapping("/import/{targetKbId}")
    public Result<String> importKb(@PathVariable String targetKbId, @RequestParam("file") MultipartFile file) throws IOException {
        String kbId = exportService.importFromJson(file.getInputStream(), targetKbId);
        return Results.success(kbId);
    }
}
