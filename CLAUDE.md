# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

The Maven parent POM is at `backend/pom.xml`. All `mvn` commands should be run from the `backend/` directory or use `-f backend/pom.xml`.

```bash
# Build entire project
cd backend && mvn clean package

# Build without tests
cd backend && mvn clean package -DskipTests

# Build specific module
cd backend && mvn clean package -pl bootstrap

# Run the application (after build)
java -jar backend/bootstrap/target/ragent-0.0.1-SNAPSHOT.jar

# Run all tests
cd backend && mvn clean test

# Run a single test class
cd backend && mvn test -Dtest=ClassName -pl bootstrap

# Format code (Spotless runs on compile phase automatically)
cd backend && mvn spotless:apply
```

### Frontend

```bash
cd frontend && npm install     # install dependencies
cd frontend && npm run dev     # dev server on port 5173
cd frontend && npm run build   # production build
cd frontend && npm run lint    # ESLint check
```

The Vite dev server proxies `/api` to `http://localhost:9090`.

The backend application starts on `http://localhost:9090/api/ragent`.

## Infrastructure Dependencies

The app requires these services running locally (see `config/docker-compose.yml`):
- **PostgreSQL** (port 5432) — relational data and optional pgVector store
- **Redis** (port 6379, password: `123456`) — rate limiting, semaphores, conversation memory TTL
- **Milvus** (port 19530) — primary vector store (can switch to pgVector via `rag.vector.type: pg`)
- **RocketMQ** — async document ingestion pipeline
- **RustFS** (S3-compatible, port 9000) — document file storage
- **Ollama** (port 11434, optional) — local LLM inference for offline deployment

Milvus has its own compose files under `backend/resources/docker/`. It is not included in the main docker-compose.

AI provider API keys go in `ragent-secrets.yaml` at the project root (imported optionally, not committed). See `config/ragent-secrets.example.yaml` for the template.

## Project Module Structure

```
backend/
├── framework/      # Cross-cutting infrastructure: exceptions, user context, Snowflake IDs,
│                   # Redis ops, AOP annotations (@RagTraceNode, @ChatRateLimit, @IdempotentSubmit),
│                   # MyBatis-Plus config, Sa-Token auth, RocketMQ integration
├── infra-ai/       # AI provider abstraction: ChatClient/EmbeddingClient implementations for
│                   # SparkCode, BaiLian, SiliconFlow, Ollama; RoutingLLMService with failover
├── bootstrap/      # All business logic and application entry point
│                   # Domains: rag/, knowledge/, ingestion/, user/, admin/
└── mcp-server/     # MCP (Model Context Protocol) tool execution framework (standalone, port 9099)

frontend/           # React 18 + TypeScript + Vite
                    # Tailwind CSS + shadcn/ui + Zustand + React Router
                    # Chat UI with SSE streaming, admin panel, knowledge management
```

Business logic lives almost entirely in `bootstrap/`. The other backend modules are infrastructure.

## RAG Pipeline Architecture

The main chat flow in `RAGChatServiceImpl` follows this sequence:

1. **Memory loading** — sliding-window conversation history with auto-summarization (Redis-backed, TTL-controlled)
2. **Query rewrite** — multi-turn context completion + complex-query decomposition into sub-questions
3. **Intent classification** — tree-based multi-level classification (domain → category → topic) via `IntentResolver`
4. **Ambiguity guidance** — low-confidence intents trigger clarifying questions rather than retrieval
5. **Multi-channel retrieval** — parallel execution: intent-directed search (always) + keyword search + global vector search (when confidence < 0.6). Fusion scoring: 0.7 semantic + 0.3 keyword.
6. **Post-processing** — deduplication → reranking
7. **MCP tool invocation** — if intent is tool-call type, executes via MCP protocol
8. **Prompt assembly** — formats chunks + conversation history into final prompt
9. **Model routing** — `RoutingLLMService` tries candidates by priority; first-packet probing enables seamless failover during streaming
10. **SSE stream output** — returned to client via Server-Sent Events

Key entry point: `RAGChatController` → `/rag/v3/chat` (SSE endpoint).

## Knowledge Base & Document Ingestion

Documents go through: upload (RustFS storage) → parsing (Apache Tika: PDF/DOCX/Markdown) → chunking (fixed-size or structure-aware) → embedding → vector store ingestion.

- Concurrency is controlled by a distributed semaphore (`rag.semaphore.document-upload.max-concurrent: 10`)
- A scheduled scanner (`rag.knowledge.schedule.scan-delay-ms`) picks up PENDING/RUNNING documents and retries timed-out ones
- Distributed locking prevents duplicate processing across instances

## Thread Pool Design

`ThreadPoolExecutorConfig` defines 8 specialized pools, all wrapped with `TtlExecutors` for `ThreadLocal` context propagation:
- `ragContextAssemblyExecutor` — context formatting
- `multiChannelRetrievalExecutor` — parallel retrieval channels
- `intentClassificationExecutor` — intent tree traversal
- `memorySummarizationExecutor` — background summarization
- `modelStreamOutputExecutor` — SSE stream handling
- `chatEntryPointExecutor` — request entry coordination
- `mcpBatchExecutionExecutor` — MCP tool calls
- `internalRetrievalExecutor` — sub-retrieval tasks

## Key Configuration (`application.yaml`)

```yaml
rag.vector.type: pg            # pg or milvus
rag.default.dimension: 1536    # embedding dimension
rag.query-rewrite.enabled: true
rag.rate-limit.global.max-concurrent: 1   # global concurrency limit
rag.memory.history-keep-turns: 4
rag.memory.summary-start-turns: 5
ai.chat.default-model: deepseek-v3-online
```

Secrets (API keys, provider config) go in `ragent-secrets.yaml` at the project root, which is imported optionally and not committed.

## AOP Annotations (framework module)

- `@RagTraceNode` — records full-chain trace for each pipeline stage (queryable via `RagTraceController`)
- `@ChatRateLimit` — Redis Lua-based distributed rate limiting
- `@IdempotentSubmit` — prevents duplicate request processing

## Database

PostgreSQL schema: `backend/resources/database/schema_pg.sql` (full DDL with pgvector extension)
Init data: `backend/resources/database/init_data_pg.sql`
Upgrade scripts: `backend/resources/database/upgrade_v1.0_to_v1.1.sql`, `upgrade_v1.1_to_v1.2.sql`

## Code Formatting

Spotless is configured and runs on the `compile` phase. Before committing, run `mvn spotless:apply` or `mvn compile` to auto-format. The build will fail if formatting is inconsistent. Spotless license headers come from `resources/format/copyright.txt`.
