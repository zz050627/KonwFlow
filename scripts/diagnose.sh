#!/bin/bash

# KnowFlow 功能诊断脚本
# 用于快速定位 B000001 系统错误

BASE_URL="http://localhost:9090/api/knowflow"

echo "=========================================="
echo "KnowFlow 功能诊断"
echo "=========================================="

# 1. 测试登录
echo -e "\n[1/6] 测试登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')

echo "$LOGIN_RESPONSE" | grep -q '"success":true'
if [ $? -eq 0 ]; then
  echo "✅ 登录成功"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo "   Token: ${TOKEN:0:20}..."
else
  echo "❌ 登录失败"
  echo "   响应: $LOGIN_RESPONSE"
  exit 1
fi

# 2. 测试获取知识库列表
echo -e "\n[2/6] 测试获取知识库列表..."
KB_LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/knowledge-base?current=1&size=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$KB_LIST_RESPONSE" | grep -q '"success":true'
if [ $? -eq 0 ]; then
  echo "✅ 获取知识库列表成功"
  KB_COUNT=$(echo "$KB_LIST_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo "   知识库数量: $KB_COUNT"
else
  echo "❌ 获取知识库列表失败"
  echo "   响应: $KB_LIST_RESPONSE"
fi

# 3. 测试创建知识库
echo -e "\n[3/6] 测试创建知识库..."
CREATE_KB_RESPONSE=$(curl -s -X POST "$BASE_URL/knowledge-base" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "诊断测试知识库",
    "description": "用于诊断系统功能",
    "embeddingModel": "bge-m3-sf"
  }')

echo "$CREATE_KB_RESPONSE" | grep -q '"success":true'
if [ $? -eq 0 ]; then
  echo "✅ 创建知识库成功"
  KB_ID=$(echo "$CREATE_KB_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   知识库ID: $KB_ID"
else
  echo "❌ 创建知识库失败"
  echo "   响应: $CREATE_KB_RESPONSE"

  # 检查是否是因为已存在
  if echo "$CREATE_KB_RESPONSE" | grep -q "已存在"; then
    echo "   提示: 知识库可能已存在，尝试使用现有知识库"
    KB_ID=$(echo "$KB_LIST_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   使用知识库ID: $KB_ID"
  else
    echo "   跳过后续测试"
    exit 1
  fi
fi

# 4. 测试上传文档
echo -e "\n[4/6] 测试上传文档..."

# 创建测试文件
cat > /tmp/test_doc.txt << 'EOF'
测试文档

这是一个用于测试关键词提取功能的文档。

主要内容：
1. Redis 是一个内存数据库
2. 支持多种数据结构
3. 常用于缓存场景
EOF

UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/knowledge-base/$KB_ID/docs/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_doc.txt" \
  -F "sourceType=FILE" \
  -F "processMode=CHUNK" \
  -F "chunkStrategy=STRUCTURE_AWARE")

echo "$UPLOAD_RESPONSE" | grep -q '"success":true'
if [ $? -eq 0 ]; then
  echo "✅ 上传文档成功"
  DOC_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   文档ID: $DOC_ID"
else
  echo "❌ 上传文档失败"
  echo "   响应: $UPLOAD_RESPONSE"

  # 分析错误原因
  if echo "$UPLOAD_RESPONSE" | grep -q "B000001"; then
    echo ""
    echo "⚠️  检测到 B000001 系统错误！"
    echo ""
    echo "可能的原因："
    echo "1. 文件存储服务（RustFS/S3）未启动或配置错误"
    echo "2. Milvus 服务未启动或连接失败"
    echo "3. 数据库连接问题"
    echo "4. 缺少必要的配置项"
    echo ""
    echo "请检查 IDEA 控制台的完整错误日志"
  fi
  exit 1
fi

# 5. 测试触发分块
echo -e "\n[5/6] 测试触发分块..."
CHUNK_RESPONSE=$(curl -s -X POST "$BASE_URL/knowledge-base/docs/$DOC_ID/chunk" \
  -H "Authorization: Bearer $TOKEN")

echo "$CHUNK_RESPONSE" | grep -q '"success":true'
if [ $? -eq 0 ]; then
  echo "✅ 触发分块成功"
  echo "   等待处理完成（10秒）..."
  sleep 10
else
  echo "❌ 触发分块失败"
  echo "   响应: $CHUNK_RESPONSE"
fi

# 6. 测试查看分块结果
echo -e "\n[6/6] 测试查看分块结果..."
CHUNKS_RESPONSE=$(curl -s -X GET "$BASE_URL/knowledge-base/docs/$DOC_ID/chunks?current=1&size=5" \
  -H "Authorization: Bearer $TOKEN")

echo "$CHUNKS_RESPONSE" | grep -q '"success":true'
if [ $? -eq 0 ]; then
  echo "✅ 查看分块结果成功"
  CHUNK_COUNT=$(echo "$CHUNKS_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  echo "   分块数量: $CHUNK_COUNT"

  # 检查是否有关键词
  if echo "$CHUNKS_RESPONSE" | grep -q '"keywords"'; then
    echo "✅ 关键词提取功能正常"
  else
    echo "⚠️  未检测到关键词字段"
  fi
else
  echo "❌ 查看分块结果失败"
  echo "   响应: $CHUNKS_RESPONSE"
fi

echo -e "\n=========================================="
echo "诊断完成"
echo "=========================================="

# 清理测试文件
rm -f /tmp/test_doc.txt

echo -e "\n如果看到 B000001 错误，请："
echo "1. 检查 IDEA 控制台的完整错误堆栈"
echo "2. 确认以下服务是否启动："
echo "   - PostgreSQL (5432)"
echo "   - Redis (6379)"
echo "   - Milvus (19530) 或 PgVector"
echo "   - RustFS/S3 (9000)"
echo "   - Ollama (11434)"
echo "3. 检查 application.yaml 配置是否正确"
