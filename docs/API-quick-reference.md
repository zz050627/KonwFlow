# RAG系统优化 API速查表

## 知识库管理

### 统计分析
```bash
GET /api/knowflow/knowledge/stats/{kbId}
```

### 导出/导入
```bash
GET  /api/knowflow/knowledge/export/{kbId}
POST /api/knowflow/knowledge/export/import/{targetKbId}
```

### 版本管理
```bash
POST /api/knowflow/knowledge/version/{kbId}/snapshot?versionTag=v1.0
GET  /api/knowflow/knowledge/version/{kbId}/list
POST /api/knowflow/knowledge/version/{kbId}/rollback/{versionId}
```

### 模型迁移
```bash
POST /api/knowflow/knowledge/migration/{kbId}/start?newModelId=xxx
GET  /api/knowflow/knowledge/migration/{kbId}/status
POST /api/knowflow/knowledge/migration/{kbId}/cancel
```

## 对话功能

### 引用溯源
```bash
GET /api/knowflow/rag/citation/{chunkId}
```

### 意图反馈
```bash
POST /api/knowflow/rag/intent/feedback?query=xxx&predictedIntent=A&actualIntent=B&confidence=0.6
```

### 负反馈
```bash
POST /api/knowflow/rag/feedback/negative?chunkId=xxx&query=yyy
```

## 性能指标

- 重复查询：200ms → 5ms
- 短查询准确率：65% → 82%
- 大文档更新：5分钟 → 30秒
