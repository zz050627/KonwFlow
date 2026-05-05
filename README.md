# KnowFlow - RAG 智能问答系统

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Java](https://img.shields.io/badge/Java-17-ff7f2a.svg)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.7-6db33f.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)
![pgvector](https://img.shields.io/badge/pgvector-0.1.6-336791.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)

> 基于 Spring Boot 3 + React 18 构建的 RAG 智能问答系统，采用 PostgreSQL + pgvector 一体化存储，Docker 一键部署，开箱即用。

## 为什么选择 KnowFlow？

| 特性 | 说明 |
|------|------|
| **一体化存储** | PostgreSQL 同时承载业务数据和向量检索，无需额外部署 Milvus 等向量数据库 |
| **Docker 一键部署** | `docker compose up -d` 即可启动全部 7 个服务，含前端、后端、数据库、缓存、消息队列、对象存储 |
| **多路检索融合** | 意图导向检索 + 关键词检索 + 全局向量检索并行执行，0.7 语义 + 0.3 关键词融合评分 |
| **流式对话** | SSE 实时流式输出，支持深度思考模式展示推理过程 |
| **全链路可观测** | 每个 RAG 环节（改写、意图、检索、生成）均有 Trace 记录 |

## 快速开始

### Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/yourname/knowflow.git
cd knowflow

# 2. 配置 AI API Key（可选，默认使用 Ollama）
cp config/knowflow-secrets.example.yaml config/knowflow-secrets.yaml
# 编辑 config/knowflow-secrets.yaml 填入 API Key

# 3. 一键启动
docker compose up -d

# 4. 访问
# 前端: http://localhost
# 登录: admin / admin
```

### 本地开发

```bash
# 启动基础设施
cd config && docker compose up -d

# 后端
cd backend && mvn clean package -DskipTests
java -jar backend/bootstrap/target/bootstrap-0.0.1-SNAPSHOT.jar

# 前端
cd frontend && npm install && npm run dev
```

## 系统架构

```
浏览器 → Nginx (前端 SPA + API 反向代理)
              ↓
       Spring Boot (RAG Pipeline)
              ↓
    ┌─────────┼─────────┬──────────┐
    ↓         ↓         ↓          ↓
 PostgreSQL  Redis    RustFS   RocketMQ
 (+ pgvector) (缓存)  (文件存储) (消息队列)
```

### RAG 处理流程

```
用户提问
  ↓
查询改写（多轮上下文补全 + 子问题拆分）
  ↓
意图识别（树形分类 → 置信度评估 → 低置信度引导澄清）
  ↓
多通道并行检索（意图导向 + 关键词 + 全局向量）
  ↓
结果融合 → 去重 → 重排序
  ↓
Prompt 组装（检索结果 + 对话历史）
  ↓
模型路由（优先级调度 → 首包探测 → 自动降级）
  ↓
SSE 流式输出
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Java 17, Spring Boot 3.5.7, MyBatis-Plus 3.5.14 |
| 数据库 | PostgreSQL 16 + pgvector（业务数据 + 向量一体化） |
| 缓存 | Redis 7 + Redisson（分布式锁、限流、会话记忆） |
| 消息队列 | RocketMQ 5.2（异步文档处理） |
| 文件存储 | RustFS（S3 兼容） |
| 文档解析 | Apache Tika 3.2（PDF/Word/Markdown） |
| 认证 | Sa-Token 1.43 |
| 前端 | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| AI | Ollama（本地）/ 支持多 Provider 接入 |

## 项目结构

```
knowflow/
├── backend/
│   ├── bootstrap/          # 主应用（业务逻辑 + RAG Pipeline）
│   ├── framework/          # 基础设施（异常、AOP、分布式ID、限流）
│   ├── infra-ai/           # AI 抽象层（ChatClient、EmbeddingClient、模型路由）
│   └── mcp-server/         # MCP 工具执行框架
├── frontend/               # React SPA
├── config/                 # 部署配置（docker-compose、secrets 模板）
├── docker-compose.yml      # 全栈一键部署
└── docs/                   # 文档
```

## 配置说明

主要配置在 `backend/bootstrap/src/main/resources/application.yaml`，支持环境变量覆盖：

| 配置项 | 默认值 | 环境变量 |
|--------|--------|----------|
| 数据库连接 | PostgreSQL 本地 | `SPRING_DATASOURCE_URL` |
| Redis | 本地 6379 | `SPRING_DATA_REDIS_HOST` |
| 向量存储 | pgvector | `RAG_VECTOR_TYPE` |
| AI 模型 | Ollama 本地 | `OLLAMA_BASE_URL` |
| 文件存储 | RustFS 本地 | `RUSTFS_URL` |

## License

[Apache License 2.0](./LICENSE)
