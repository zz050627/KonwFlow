# 知识库优化 v1.3

## 新增功能

### ✅ 性能优化
- **自适应检索**：动态topK + 智能阈值过滤
- **Redis缓存**：重复查询响应时间 200ms → 5ms

### ✅ 管理功能
- **统计分析**：文档数、热点chunk追踪
- **导出/导入**：跨环境迁移
- **版本管理**：快照创建、历史回滚
- **增量更新**：仅更新变更分块
- **模型迁移**：后台异步切换embedding模型

## 快速使用

### 数据库升级
```bash
psql -h 127.0.0.1 -U postgres -d ragent -f bootstrap/src/main/resources/database/upgrade_v1.2_to_v1.3.sql
```

### API示例
```bash
# 统计
GET /api/ragent/knowledge/stats/{kbId}

# 导出
GET /api/ragent/knowledge/export/{kbId}

# 创建快照
POST /api/ragent/knowledge/version/{kbId}/snapshot?versionTag=v1.0

# 模型迁移
POST /api/ragent/knowledge/migration/{kbId}/start?newModelId=xxx
GET  /api/ragent/knowledge/migration/{kbId}/status
```

## 性能提升

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 重复查询 | 200ms | 5ms |
| 短查询准确率 | 65% | 82% |
| 大文档更新 | 5min | 30s |

## 详细文档

- [完整总结](knowledge-optimization-summary.md)
- [实施指南](knowledge-optimization-guide.md)
