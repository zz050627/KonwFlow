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
import com.nageoffer.ai.ragent.knowledge.service.MultiModelMigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ragent/knowledge/migration")
@RequiredArgsConstructor
public class MultiModelMigrationController {

    private final MultiModelMigrationService migrationService;

    @PostMapping("/{kbId}/start")
    public Result<Void> startMigration(@PathVariable String kbId, @RequestParam String newModelId) {
        migrationService.startMigration(kbId, newModelId);
        return Results.success();
    }

    @GetMapping("/{kbId}/status")
    public Result<String> getStatus(@PathVariable String kbId) {
        return Results.success(migrationService.getMigrationStatus(kbId));
    }

    @PostMapping("/{kbId}/cancel")
    public Result<Void> cancel(@PathVariable String kbId) {
        migrationService.cancelMigration(kbId);
        return Results.success();
    }
}
