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
import com.nageoffer.ai.ragent.knowledge.dto.KnowledgeVersionVO;
import com.nageoffer.ai.ragent.knowledge.service.KnowledgeVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/knowflow/knowledge/version")
@RequiredArgsConstructor
public class KnowledgeVersionController {

    private final KnowledgeVersionService versionService;

    @PostMapping("/{kbId}/snapshot")
    public Result<String> createSnapshot(@PathVariable String kbId,
                                          @RequestParam String versionTag,
                                          @RequestParam(required = false) String description) {
        return Results.success(versionService.createSnapshot(kbId, versionTag, description));
    }

    @PostMapping("/{kbId}/rollback/{versionId}")
    public Result<Void> rollback(@PathVariable String kbId, @PathVariable String versionId) {
        versionService.rollback(kbId, versionId);
        return Results.success();
    }

    @GetMapping("/{kbId}/list")
    public Result<List<KnowledgeVersionVO>> listVersions(@PathVariable String kbId) {
        return Results.success(versionService.listVersions(kbId));
    }
}
