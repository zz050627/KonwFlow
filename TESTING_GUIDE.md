# KnowFlow 关键词检索功能测试指南

## 一、应用启动验证

### ✅ 启动成功标志
看到以下日志说明应用已正常启动：
```
WARN ... GlobalExceptionHandler : [GET] http://localhost:9090/api/knowflow/ [auth] not-login: 未能读取到有效 token
```

这是**正常的认证警告**，说明：
- ✅ 应用已启动在 `http://localhost:9090/api/knowflow`
- ✅ 认证拦截器正常工作
- ⚠️ 需要登录才能访问 API

---

## 二、前置条件检查

### 1. 检查 Ollama 服务
```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 应该返回模型列表，包含 qwen2.5:0.5b
```

### 2. 检查数据库
```bash
# 连接 PostgreSQL
psql -h 127.0.0.1 -U postgres -d knowflow

# 检查 keywords 字段是否存在
\d t_knowledge_chunk

# 应该看到 keywords 列（varchar 512）
```

### 3. 检查 Milvus
```bash
# 如果使用 Milvus（application.yaml 中 rag.vector.type: milvus）
# 检查 Milvus 是否运行
curl http://localhost:19530/healthz
```

---

## 三、用户登录

### 方法 1：使用前端登录
1. 打开浏览器访问：`http://localhost:9090/api/knowflow`
2. 使用默认账号登录（查看 PostgreSQL 初始化数据中的用户）
3. 登录后浏览器会保存 token

### 方法 2：直接使用 API 登录（推荐测试）

#### 2.1 查看初始用户
```bash
# 连接数据库查看用户
psql -h 127.0.0.1 -U postgres -d knowflow -c "SELECT username, password FROM t_user LIMIT 5;"
```

#### 2.2 登录获取 token
```bash
# 假设有用户 admin/admin123
curl -X POST http://localhost:9090/api/knowflow/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# 返回示例：
# {
#   "code": "00000",
#   "message": "success",
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "username": "admin"
#   },
#   "success": true
# }
```

#### 2.3 保存 token 到环境变量
```bash
# 提取 token（Linux/Mac）
export TOKEN=$(curl -s -X POST http://localhost:9090/api/knowflow/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.token')

echo $TOKEN

# Windows PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:9090/api/knowflow/user/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin123"}'
$TOKEN = $response.data.token
echo $TOKEN
```

---

## 四、功能测试

### 测试 1：创建知识库

```bash
curl -X POST http://localhost:9090/api/knowflow/knowledge-base \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试知识库",
    "description": "用于测试关键词检索功能",
    "embeddingModel": "bge-m3-sf"
  }'

# 记录返回的 kbId，例如：1234567890
export KB_ID="返回的kbId"
```

### 测试 2：上传文档

```bash
# 创建测试文档
cat > test_doc.txt << 'EOF'
Redis 是一个开源的内存数据库，支持多种数据结构。

Redis 配置说明：
1. 设置最大内存：maxmemory 2gb
2. 配置持久化：save 900 1
3. 启用 AOF：appendonly yes
4. 设置密码：requirepass your_password

Redis 常用命令：
- SET key value：设置键值
- GET key：获取值
- DEL key：删除键
- EXPIRE key seconds：设置过期时间

Redis 性能优化：
- 使用连接池
- 合理设置过期时间
- 避免大 key
- 使用 Pipeline 批量操作
EOF

# 上传文档
curl -X POST "http://localhost:9090/api/knowflow/knowledge-base/$KB_ID/docs/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_doc.txt" \
  -F "sourceType=FILE" \
  -F "processMode=CHUNK" \
  -F "chunkStrategy=STRUCTURE_AWARE"

# 记录返回的 docId
export DOC_ID="返回的docId"
```

### 测试 3：触发分块（包含关键词提取）

```bash
# 开始分块处理
curl -X POST "http://localhost:9090/api/knowflow/knowledge-base/docs/$DOC_ID/chunk" \
  -H "Authorization: Bearer $TOKEN"

# 等待 10-30 秒让分块和关键词提取完成
sleep 15

# 查看分块结果
curl -X GET "http://localhost:9090/api/knowflow/knowledge-base/docs/$DOC_ID/chunks?current=1&size=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 测试 4：验证关键词提取

```bash
# 查看数据库中的分块数据
psql -h 127.0.0.1 -U postgres -d knowflow -c "
SELECT
  chunk_index,
  LEFT(content, 50) as content_preview,
  content_hash
FROM t_knowledge_chunk
WHERE doc_id = '$DOC_ID'
ORDER BY chunk_index;
"

# 应该看到每个 chunk 都有关键词，例如：
# chunk_index | content_preview                    | keywords
# ------------+------------------------------------+---------------------------
# 0           | Redis 是一个开源的内存数据库...    | Redis,内存数据库,数据结构
# 1           | Redis 配置说明：...                | Redis,配置,maxmemory,持久化
# 2           | Redis 常用命令：...                | Redis,命令,SET,GET,DEL
```

### 测试 5：测试关键词检索

```bash
# 创建会话
curl -X POST http://localhost:9090/api/knowflow/rag/conversation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试关键词检索"
  }'

# 记录返回的 conversationId
export CONV_ID="返回的conversationId"

# 测试关键词检索（使用 SSE 流式输出）
curl -N -X POST http://localhost:9090/api/knowflow/rag/v3/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "'$CONV_ID'",
    "message": "如何配置 Redis 的最大内存？"
  }'

# 应该看到流式输出，包含：
# - 检索到的相关 chunk（包含 "maxmemory" 关键词）
# - AI 生成的回答
```

### 测试 6：查看检索日志

```bash
# 查看应用日志，搜索关键词检索相关日志
# 应该看到类似：
# INFO ... KeywordMilvusSearchChannel : 提取到关键词: [配置, Redis, 最大内存]
# INFO ... KeywordMilvusSearchChannel : 关键词检索完成，检索到 2 个 Chunk，置信度：0.6
# INFO ... DeduplicationPostProcessor : 去重后保留 3 个 Chunk（融合评分）
```

---

## 五、验证混合检索

### 测试场景 1：纯关键词匹配
```bash
# 查询包含特定关键词的内容
curl -N -X POST http://localhost:9090/api/knowflow/rag/v3/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "'$CONV_ID'",
    "message": "Redis 的 SET 命令怎么用？"
  }'

# 预期：
# - 关键词检索通道命中（keywords 包含 "SET", "命令"）
# - 语义检索通道也命中
# - 融合评分后返回最相关的结果
```

### 测试场景 2：语义相似但关键词不同
```bash
curl -N -X POST http://localhost:9090/api/knowflow/rag/v3/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "'$CONV_ID'",
    "message": "怎么给 Redis 设置内存上限？"
  }'

# 预期：
# - 语义检索命中（"内存上限" ≈ "最大内存"）
# - 关键词检索可能部分命中（"内存"）
# - 融合评分后返回 maxmemory 相关内容
```

### 测试场景 3：多关键词组合
```bash
curl -N -X POST http://localhost:9090/api/knowflow/rag/v3/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "'$CONV_ID'",
    "message": "Redis 持久化和 AOF 的配置方法"
  }'

# 预期：
# - 关键词检索命中多个关键词（"持久化", "AOF", "配置"）
# - 置信度较高（0.6-0.8）
# - 返回配置相关的 chunk
```

---

## 六、性能测试

### 测试关键词提取性能
```bash
# 上传较大文档（1000+ 字）
# 观察日志中的耗时：
# - extractDuration: 文档解析耗时
# - chunkDuration: 分块耗时
# - embedDuration: 嵌入耗时
# - 关键词提取耗时（在 chunkDuration 之后）

# 查看分块日志
curl -X GET "http://localhost:9090/api/knowflow/knowledge-base/docs/$DOC_ID/chunk-logs?current=1&size=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 测试检索性能
```bash
# 多次查询，观察响应时间
for i in {1..5}; do
  echo "=== 第 $i 次查询 ==="
  time curl -s -X POST http://localhost:9090/api/knowflow/rag/v3/chat \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "conversationId": "'$CONV_ID'",
      "message": "Redis 配置"
    }' > /dev/null
done

# 预期：
# - 首次查询：200-500ms（包含关键词提取）
# - 后续查询：100-300ms（缓存生效）
```

---

## 七、故障排查

### 问题 1：关键词为空
**现象**：数据库中 keywords 字段为 NULL 或空字符串

**排查步骤**：
```bash
# 1. 检查 Ollama 服务
curl http://localhost:11434/api/tags

# 2. 检查配置
grep -A 5 "ai.keyword" bootstrap/src/main/resources/application.yaml

# 3. 查看应用日志
grep "关键词提取" logs/knowflow.log

# 4. 手动测试关键词提取
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:0.5b",
    "messages": [
      {
        "role": "user",
        "content": "从以下文本中提取5个最重要的关键词，用逗号分隔，只返回关键词：Redis 是一个开源的内存数据库"
      }
    ],
    "stream": false
  }'
```

### 问题 2：关键词检索无结果
**现象**：查询时关键词检索通道返回 0 个结果

**排查步骤**：
```bash
# 1. 检查 Milvus collection 是否有 keywords 字段
# （需要 Milvus 客户端或管理界面）

# 2. 检查数据库中是否有分块数据
psql -h 127.0.0.1 -U postgres -d knowflow -c "
SELECT COUNT(*) as total,
       COUNT(content_hash) as with_content_hash,
       COUNT(*) - COUNT(content_hash) as without_content_hash
FROM t_knowledge_chunk;
"

# 3. 查看检索日志
grep "KeywordMilvusSearchChannel" logs/knowflow.log
```

### 问题 3：编译错误
**现象**：修改代码后编译失败

**解决方案**：
```bash
# 1. 清理并重新编译
mvn clean compile -DskipTests

# 2. 如果仍然失败，检查 Java 版本
java -version  # 应该是 17+

# 3. 检查依赖
mvn dependency:tree | grep milvus
```

---

## 八、监控指标

### 关键指标
1. **关键词提取成功率**：`keywords IS NOT NULL` 的 chunk 占比
2. **关键词检索命中率**：关键词检索通道返回结果的查询占比
3. **混合检索效果**：融合评分后的结果相关性
4. **性能指标**：
   - 关键词提取平均耗时
   - 关键词检索平均耗时
   - 端到端查询响应时间

### 监控 SQL
```sql
-- 关键词提取成功率
SELECT 
  COUNT(*) as total_chunks,
  COUNT(keywords) as chunks_with_keywords,
  ROUND(COUNT(keywords)::numeric / COUNT(*) * 100, 2) as success_rate_percent
FROM t_knowledge_chunk
WHERE deleted = 0;

-- 平均关键词数量
SELECT 
  AVG(array_length(string_to_array(keywords, ','), 1)) as avg_keyword_count
FROM t_knowledge_chunk
WHERE keywords IS NOT NULL AND deleted = 0;

-- 最近上传的文档及其关键词提取状态
SELECT 
  d.id,
  d.doc_name,
  d.status,
  COUNT(c.id) as chunk_count,
  COUNT(c.keywords) as chunks_with_keywords
FROM t_knowledge_document d
LEFT JOIN t_knowledge_chunk c ON d.id = c.doc_id
WHERE d.deleted = 0
GROUP BY d.id, d.doc_name, d.status
ORDER BY d.create_time DESC
LIMIT 10;
```

---

## 九、快速测试脚本

### 完整测试脚本（Bash）
```bash
#!/bin/bash

# 配置
BASE_URL="http://localhost:9090/api/knowflow"
USERNAME="admin"
PASSWORD="admin123"

# 1. 登录
echo "=== 1. 登录 ==="
TOKEN=$(curl -s -X POST "$BASE_URL/user/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ 登录失败"
  exit 1
fi
echo "✅ 登录成功，token: ${TOKEN:0:20}..."

# 2. 创建知识库
echo -e "\n=== 2. 创建知识库 ==="
KB_ID=$(curl -s -X POST "$BASE_URL/knowledge-base" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试知识库","description":"关键词检索测试"}' \
  | jq -r '.data.id')

echo "✅ 知识库创建成功，ID: $KB_ID"

# 3. 创建测试文档
echo -e "\n=== 3. 创建测试文档 ==="
cat > /tmp/test_redis.txt << 'EOF'
Redis 配置指南

Redis 是一个高性能的键值数据库。以下是常用配置：

1. 内存配置
   - maxmemory 2gb：设置最大内存为 2GB
   - maxmemory-policy allkeys-lru：内存淘汰策略

2. 持久化配置
   - save 900 1：900秒内至少1个key变化时保存
   - appendonly yes：启用 AOF 持久化

3. 安全配置
   - requirepass your_password：设置访问密码
   - bind 127.0.0.1：绑定监听地址
EOF

# 4. 上传文档
echo -e "\n=== 4. 上传文档 ==="
DOC_ID=$(curl -s -X POST "$BASE_URL/knowledge-base/$KB_ID/docs/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_redis.txt" \
  -F "sourceType=FILE" \
  | jq -r '.data.id')

echo "✅ 文档上传成功，ID: $DOC_ID"

# 5. 触发分块
echo -e "\n=== 5. 触发分块（包含关键词提取）==="
curl -s -X POST "$BASE_URL/knowledge-base/docs/$DOC_ID/chunk" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo "⏳ 等待分块和关键词提取完成（15秒）..."
sleep 15

# 6. 查看分块结果
echo -e "\n=== 6. 查看分块结果 ==="
curl -s -X GET "$BASE_URL/knowledge-base/docs/$DOC_ID/chunks?current=1&size=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.records[] | {index: .chunkIndex, keywords: .keywords, content: .content[0:50]}'

# 7. 测试检索
echo -e "\n=== 7. 测试关键词检索 ==="
CONV_ID=$(curl -s -X POST "$BASE_URL/rag/conversation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试"}' \
  | jq -r '.data.id')

echo "✅ 会话创建成功，ID: $CONV_ID"
echo -e "\n查询：Redis 的内存配置怎么设置？"
curl -N -X POST "$BASE_URL/rag/v3/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"$CONV_ID\",\"message\":\"Redis 的内存配置怎么设置？\"}"

echo -e "\n\n✅ 测试完成！"
```

保存为 `test_keyword_search.sh`，然后运行：
```bash
chmod +x test_keyword_search.sh
./test_keyword_search.sh
```

---

## 十、总结

### 测试检查清单
- [ ] 应用成功启动（看到认证警告）
- [ ] Ollama 服务运行正常
- [ ] 数据库升级完成（keywords 字段存在）
- [ ] 用户登录成功（获取 token）
- [ ] 知识库创建成功
- [ ] 文档上传成功
- [ ] 分块完成且包含关键词
- [ ] 关键词检索返回结果
- [ ] 混合检索融合评分正常
- [ ] 日志中看到关键词提取和检索日志

### 预期效果
- ✅ 每个 chunk 自动提取 3-5 个关键词
- ✅ 关键词检索能匹配相关内容
- ✅ 混合检索提升召回率和准确率
- ✅ 端到端响应时间 < 500ms

---

**测试愉快！** 🚀
