# RAGent Backend

RAG综合智能体后端服务 - 基于Spring Boot 3.5.7的智能文档处理与检索系统

## 技术栈

- **Java 17**
- **Spring Boot 3.5.7**
- **MyBatis-Plus 3.5.14**
- **PostgreSQL** - 关系型数据库
- **Redis** - 缓存、分布式锁、限流
- **Milvus 2.6.6** - 向量数据库
- **RocketMQ** - 消息队列
- **Apache Tika 3.2.3** - 文档解析

## 模块结构

```
backend/
├── bootstrap/      # 主应用模块（业务逻辑）
├── framework/      # 基础设施框架
├── infra-ai/       # AI服务抽象层
├── mcp-server/     # MCP工具执行框架
└── resources/      # 资源文件（数据库脚本、配置模板）
```

## 快速开始

### 1. 构建项目

```bash
# 完整构建
mvn clean package

# 跳过测试
mvn clean package -DskipTests

# 构建指定模块
mvn clean package -pl bootstrap
```

### 2. 运行应用

```bash
# 方式1：直接运行JAR
java -jar bootstrap/target/ragent-0.0.1-SNAPSHOT.jar

# 方式2：使用启动脚本（项目根目录）
../scripts/start-ragent.cmd    # Windows
../scripts/start-ragent.ps1    # PowerShell
```

### 3. 访问应用

- **API地址**: http://localhost:9090/api/ragent
- **健康检查**: http://localhost:9090/api/ragent/actuator/health

## 开发指南

### 代码格式化

项目使用Spotless自动格式化代码：

```bash
# 手动格式化
mvn spotless:apply

# 编译时自动格式化
mvn compile
```

### 运行测试

```bash
# 运行所有测试
mvn clean test

# 运行单个测试类
mvn test -Dtest=ClassName -pl bootstrap
```

## 配置说明

主配置文件位于 `bootstrap/src/main/resources/application.yaml`

关键配置项：
- `rag.vector.type`: 向量数据库类型（pg/milvus）
- `rag.default.dimension`: 向量维度（默认1536）
- `ai.chat.default-model`: 默认对话模型
- `ai.embedding.default-model`: 默认向量化模型

详细配置说明请参考：[docs/wiki/08-配置与环境.md](../docs/wiki/08-配置与环境.md)

## 依赖服务

启动前需要运行以下基础设施（使用 `../config/docker-compose.yml`）：

- PostgreSQL (5432)
- Redis (6379)
- Milvus (19530)
- RocketMQ (9876, 10911)
- RustFS (9000)

## 文档

- [项目概览](../docs/wiki/01-项目概览.md)
- [系统架构](../docs/wiki/03-系统架构说明.md)
- [核心模块详解](../docs/wiki/05-核心模块详解.md)
- [新人上手路线](../docs/wiki/12-新人上手路线.md)

## License

见项目根目录 [LICENSE](../LICENSE)
