# 问题排查与解决方案

## 已解决的问题

### 1. 项目结构重组
**问题**: IntelliJ IDEA无法找到主类 `com.nageoffer.ai.ragent.RagentApplication`

**原因**: 项目结构从根目录移至 `backend/` 目录，IDEA的Maven配置未更新

**解决方案**:
- 已更新 `.idea/misc.xml` 指向 `backend/pom.xml`
- 在IDEA中：Maven工具窗口 → 点击刷新图标

### 2. RustFS认证配置错误
**问题**: 创建知识库时提示"系统执行出错"，后端日志显示S3连接失败

**原因**: `application.yaml` 中RustFS凭证配置错误（dummy/dummy），实际凭证是 rustfsadmin/rustfsadmin

**解决方案**:
- 已更新 `backend/bootstrap/src/main/resources/application.yaml`
- RustFS凭证改为: `rustfsadmin/rustfsadmin`
- 后端已重启

## 当前运行状态

✅ **后端服务**: http://localhost:9090/api/ragent (进程ID: 28512)
✅ **前端服务**: http://localhost:5173
✅ **数据库服务**: 
  - PostgreSQL: localhost:5432
  - Redis: localhost:6379
  - RustFS: localhost:9000
  - RocketMQ: localhost:9876

## 测试创建知识库

### 方法1: 使用浏览器（推荐）
1. 访问 http://localhost:5173
2. 使用 `admin/admin` 登录
3. 进入知识库管理页面
4. 点击"创建知识库"按钮
5. 填写信息：
   - 名称：任意中文或英文
   - Collection名称：3-63位小写字母/数字/连字符（如：my-kb-001）
   - 嵌入模型：选择可用模型

### 方法2: 使用API测试
```bash
# 1. 登录获取token
TOKEN=$(curl -s http://localhost:9090/api/ragent/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. 创建知识库
curl -X POST http://localhost:9090/api/ragent/auth/login \
  -H "Content-Type: application/json; charset=UTF-8" \
  -H "satoken: $TOKEN" \
  --data-raw '{
    "name":"My Knowledge Base",
    "embeddingModel":"text-embedding-3-small",
    "collectionName":"mykb001"
  }'
```

## 注意事项

### Collection名称规则
- 长度：3-63个字符
- 字符：只能包含小写字母、数字、连字符(-)
- 不能以连字符开头或结尾
- ✅ 正确示例：`my-kb-001`, `testkb`, `knowledge-base-2024`
- ❌ 错误示例：`MyKB`, `test_kb`, `-mykb`, `kb-`

### 常见错误

**"未登录或登录已过期"**
- 确保使用正确的登录接口：`/auth/login`（不是 `/user/login`）
- 检查token是否正确设置在请求头中（header名称：`satoken`）

**"系统执行出错"**
- 检查RustFS服务状态：`docker ps | grep rustfs`
- 查看后端日志：`tail -f /tmp/ragent.log`
- 确认RustFS凭证配置正确

**"Collection名称不合法"**
- 检查名称是否全小写
- 检查是否包含非法字符（下划线、大写字母等）

## 服务管理

### 启动后端
```bash
cd backend
java -jar bootstrap/target/bootstrap-0.0.1-SNAPSHOT.jar > /tmp/ragent.log 2>&1 &
```

### 停止后端
```bash
# 查找占用9090端口的进程
netstat -ano | grep ":9090"

# 停止进程
taskkill //F //PID <进程ID>
```

### 启动前端
```bash
cd frontend
npm run dev
```

### 查看日志
```bash
# 后端日志
tail -f /tmp/ragent.log

# Docker服务日志
docker logs ragent-postgres
docker logs ragent-redis
docker logs ragent-rustfs
```

## 下一步

现在可以：
1. 在浏览器中访问 http://localhost:5173
2. 登录后创建知识库
3. 上传文档到知识库
4. 开始使用RAG问答功能
