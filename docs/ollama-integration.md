# Ollama 本地模型集成指南

## 概述

Ragent 已支持本地 Ollama 模型调用，实现完全离线的 RAG 对话能力。

## 前置要求

1. **安装 Ollama**
   ```bash
   # 访问 https://ollama.ai 下载安装
   # 或使用包管理器安装
   ```

2. **启动 Ollama 服务**
   ```bash
   # 默认监听 http://localhost:11434
   ollama serve
   ```

3. **拉取模型**
   ```bash
   # 拉取轻量级对话模型（约 300MB）
   ollama pull qwen2.5:0.5b
   
   # 可选：拉取其他模型
   ollama pull qwen2.5:7b
   ollama pull llama3.2:3b
   ```

## 配置说明

### 环境变量配置（推荐）

在 `ragent-secrets.yaml` 或环境变量中配置：

```yaml
# Ollama 服务地址（默认 http://localhost:11434）
OLLAMA_BASE_URL: http://localhost:11434

# 对话模型（默认 qwen2.5:0.5b）
OLLAMA_CHAT_MODEL: qwen2.5:0.5b

# 向量嵌入模型（默认 qwen2.5:0.5b）
OLLAMA_EMBEDDING_MODEL: qwen2.5:0.5b

# 嵌入向量维度（qwen2.5:0.5b 为 896）
OLLAMA_EMBEDDING_DIM: 896

# 是否启用 Ollama（默认 true）
OLLAMA_ENABLED: true
```

### 直接修改 application.yaml

```yaml
ai:
  providers:
    ollama:
      url: http://localhost:11434
      endpoints:
        chat: /api/chat
        embedding: /api/embed
  
  chat:
    default-model: qwen2.5-ollama  # 设为默认模型
    candidates:
      - id: qwen2.5-ollama
        provider: ollama
        model: qwen2.5:0.5b
        priority: 0  # 降低优先级使其优先使用
        enabled: true
  
  embedding:
    default-model: qwen2.5-ollama-embed  # 设为默认嵌入模型
    candidates:
      - id: qwen2.5-ollama-embed
        provider: ollama
        model: qwen2.5:0.5b
        dimension: 896
        priority: 0  # 降低优先级使其优先使用
        enabled: true
```

## 技术实现

### 1. 对话接口（OllamaChatClient）

- **API 端点**: `POST /api/chat`
- **流式输出**: NDJSON 格式（非 SSE）
- **支持参数**:
  - `temperature`: 温度参数（0.0-2.0）
  - `top_p`: 核采样参数
  - `num_predict`: 最大生成 token 数
- **无需 API Key**: 本地服务，无需认证

**请求示例**:
```json
{
  "model": "qwen2.5:0.5b",
  "messages": [
    {"role": "system", "content": "你是一个智能助手"},
    {"role": "user", "content": "你好"}
  ],
  "stream": true,
  "options": {
    "temperature": 0.7,
    "top_p": 0.9,
    "num_predict": 2048
  }
}
```

**流式响应**（每行一个 JSON）:
```json
{"model":"qwen2.5:0.5b","message":{"role":"assistant","content":"你好"},"done":false}
{"model":"qwen2.5:0.5b","message":{"role":"assistant","content":"！"},"done":false}
{"model":"qwen2.5:0.5b","message":{"role":"assistant","content":""},"done":true}
```

### 2. 向量嵌入接口（OllamaEmbeddingClient）

- **API 端点**: `POST /api/embed`
- **支持批量**: `input` 字段可为字符串或数组
- **无需 API Key**: 本地服务，无需认证

**单条请求**:
```json
{
  "model": "qwen2.5:0.5b",
  "input": "文本内容"
}
```

**批量请求**:
```json
{
  "model": "qwen2.5:0.5b",
  "input": ["文本1", "文本2", "文本3"]
}
```

**响应格式**:
```json
{
  "embeddings": [
    [0.1, 0.2, 0.3, ...],
    [0.4, 0.5, 0.6, ...]
  ]
}
```

## 模型推荐

### 对话模型

| 模型 | 大小 | 速度 | 质量 | 推荐场景 |
|------|------|------|------|----------|
| qwen2.5:0.5b | ~300MB | 极快 | 中等 | 快速原型、资源受限环境 |
| qwen2.5:1.5b | ~900MB | 快 | 良好 | 日常对话、轻量级 RAG |
| qwen2.5:7b | ~4.7GB | 中等 | 优秀 | 生产环境、高质量对话 |
| llama3.2:3b | ~2GB | 快 | 良好 | 平衡性能与质量 |

### 嵌入模型

| 模型 | 维度 | 大小 | 推荐场景 |
|------|------|------|----------|
| qwen2.5:0.5b | 896 | ~300MB | 快速测试 |
| nomic-embed-text | 768 | ~274MB | 专用嵌入模型（推荐） |
| mxbai-embed-large | 1024 | ~669MB | 高质量嵌入 |

**推荐配置**（生产环境）:
```yaml
OLLAMA_CHAT_MODEL: qwen2.5:7b
OLLAMA_EMBEDDING_MODEL: nomic-embed-text
OLLAMA_EMBEDDING_DIM: 768
```

## 性能优化

### 1. GPU 加速

Ollama 自动检测并使用 GPU（NVIDIA/AMD/Apple Silicon）。

### 2. 并发控制

Ollama 默认支持并发请求，但受限于硬件资源。可通过环境变量调整：

```bash
# 设置并发数（默认自动）
OLLAMA_NUM_PARALLEL=4

# 设置上下文长度（默认 2048）
OLLAMA_NUM_CTX=4096
```

### 3. 模型预加载

```bash
# 预加载模型到内存，避免首次调用延迟
ollama run qwen2.5:0.5b ""
```

## 故障排查

### 1. 连接失败

```
Ollama 同步请求失败: HTTP 404
```

**解决方案**:
- 确认 Ollama 服务已启动: `curl http://localhost:11434/api/version`
- 检查 `OLLAMA_BASE_URL` 配置是否正确

### 2. 模型未找到

```
Ollama 响应缺少 message
```

**解决方案**:
- 确认模型已拉取: `ollama list`
- 拉取模型: `ollama pull qwen2.5:0.5b`

### 3. 向量维度不匹配

```
Vector dimension mismatch: expected 1536, got 896
```

**解决方案**:
- 更新 `OLLAMA_EMBEDDING_DIM` 为正确维度
- 或重建向量数据库: `rag.default.dimension: 896`

## 完全离线部署

1. **拉取所有依赖模型**
   ```bash
   ollama pull qwen2.5:0.5b
   ollama pull nomic-embed-text
   ```

2. **禁用云端模型**
   ```yaml
   ai:
     chat:
       default-model: qwen2.5-ollama
       candidates:
         # 禁用所有云端模型
         - id: claude-sonnet-4-6-agent
           enabled: false
         - id: deepseek-v3-online
           enabled: false
         # 仅启用 Ollama
         - id: qwen2.5-ollama
           enabled: true
   ```

3. **配置本地向量数据库**
   ```yaml
   rag:
     vector:
       type: pg  # 使用 PostgreSQL + pgvector
   ```

4. **启动服务**
   ```bash
   mvn clean package
   java -jar bootstrap/target/ragent-0.0.1-SNAPSHOT.jar
   ```

## 参考资料

- [Ollama 官方文档](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Qwen2.5 模型介绍](https://github.com/QwenLM/Qwen2.5)
- [Ollama 模型库](https://ollama.ai/library)
