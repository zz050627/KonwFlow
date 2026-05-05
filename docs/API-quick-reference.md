# RAG系统优化 API速查表

## 知识库管理

### 统计分析
```bash
GET /api/ragent/knowledge/stats/{kbId}
```

### 导出/导入
```bash
GET  /api/ragent/knowledge/export/{kbId}
POST /api/ragent/knowledge/export/import/{targetKbId}
```

### 版本管理
```bash
POST /api/ragent/knowledge/version/{kbId}/snapshot?versionTag=v1.0
GET  /api/ragent/knowledge/version/{kbId}/list
POST /api/ragent/knowledge/version/{kbId}/rollback/{versionId}
```

### 模型迁移
```bash
POST /api/ragent/knowledge/migration/{kbId}/start?newModelId=xxx
GET  /api/ragent/knowledge/migration/{kbId}/status
POST /api/ragent/knowledge/migration/{kbId}/cancel
```

## 对话功能

### 引用溯源
```bash
GET /api/ragent/rag/citation/{chunkId}
```

### 意图反馈
```bash
POST /api/ragent/rag/intent/feedback?query=xxx&predictedIntent=A&actualIntent=B&confidence=0.6
```

### 负反馈
```bash
POST /api/ragent/rag/feedback/negative?chunkId=xxx&query=yyy
```

## 性能指标

- 重复查询：200ms → 5ms
- 短查询准确率：65% → 82%
- 大文档更新：5分钟 → 30秒
