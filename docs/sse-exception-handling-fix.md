# SSE 异常处理修复说明

## 问题描述

在修复前，当 SSE 流式接口（`/rag/v3/chat`）发生异常时，`GlobalExceptionHandler` 会返回 `Result<Void>` 对象（实际序列化为 `LinkedHashMap`），导致客户端无法正确处理错误。

### 问题表现

**错误的响应格式：**
```json
{
  "code": "500",
  "message": "服务器内部错误",
  "data": null
}
```

这种格式不符合 SSE 规范，客户端无法正确解析。

## 修复方案

### 1. GlobalExceptionHandler 增强

**文件：** `framework/src/main/java/.../web/GlobalExceptionHandler.java`

**修改内容：**

1. **添加 SSE 请求检测**
```java
private boolean isSseRequest(HttpServletRequest request) {
    String accept = request.getHeader("Accept");
    String uri = request.getRequestURI();
    
    return (accept != null && accept.contains("text/event-stream"))
            || (uri != null && uri.contains("/chat"));
}
```

2. **添加 SSE 异常处理器**
```java
private SseEmitter handleSseException(HttpServletRequest request, Throwable throwable) {
    log.error("[{}] {} [SSE异常] ", request.getMethod(), getUrl(request), throwable);
    
    SseEmitter emitter = new SseEmitter(0L);
    try {
        String errorMessage = throwable.getMessage();
        if (StrUtil.isBlank(errorMessage)) {
            errorMessage = "服务器内部错误";
        }
        
        // 发送 SSE 错误事件
        SseEmitter.SseEventBuilder event = SseEmitter.event()
                .name("error")
                .data("{\"error\":\"" + escapeJson(errorMessage) + "\"}");
        emitter.send(event);
        emitter.complete();
    } catch (Exception e) {
        log.error("发送 SSE 错误事件失败", e);
        emitter.completeWithError(throwable);
    }
    return emitter;
}
```

3. **修改异常处理方法返回类型**
```java
@ExceptionHandler(value = {AbstractException.class})
public Object abstractException(HttpServletRequest request, AbstractException ex) {
    if (isSseRequest(request)) {
        return handleSseException(request, ex);
    }
    // ... 原有逻辑
    return Results.failure(ex);
}

@ExceptionHandler(value = Throwable.class)
public Object defaultErrorHandler(HttpServletRequest request, Throwable throwable) {
    if (isSseRequest(request)) {
        return handleSseException(request, throwable);
    }
    // ... 原有逻辑
    return Results.failure();
}
```

### 2. RAGChatController 增强

**文件：** `bootstrap/src/main/java/.../rag/controller/RAGChatController.java`

**修改内容：**

在 Controller 层面捕获异常，确保即使 Service 层抛出异常也能正确处理：

```java
@GetMapping(value = "/rag/v3/chat", produces = "text/event-stream;charset=UTF-8")
public SseEmitter chat(@RequestParam String question,
                       @RequestParam(required = false) String conversationId,
                       @RequestParam(required = false, defaultValue = "false") Boolean deepThinking,
                       @RequestParam(required = false) String modelId) {
    SseEmitter emitter = new SseEmitter(0L);
    try {
        ragChatService.streamChat(question, conversationId, deepThinking, modelId, emitter);
    } catch (Exception e) {
        log.error("SSE 流式对话启动失败", e);
        handleSseError(emitter, e);
    }
    return emitter;
}

private void handleSseError(SseEmitter emitter, Exception e) {
    try {
        String errorMessage = e.getMessage();
        if (errorMessage == null || errorMessage.isEmpty()) {
            errorMessage = "服务器内部错误";
        }
        
        SseEmitter.SseEventBuilder event = SseEmitter.event()
                .name("error")
                .data("{\"error\":\"" + escapeJson(errorMessage) + "\"}");
        emitter.send(event);
        emitter.complete();
    } catch (Exception sendError) {
        log.error("发送 SSE 错误事件失败", sendError);
        emitter.completeWithError(e);
    }
}
```

## 修复后的行为

### 正常流程

**请求：**
```bash
curl -N http://localhost:9090/api/ragent/rag/v3/chat?question=你好
```

**响应（SSE 格式）：**
```
event: meta
data: {"conversationId":"123","taskId":"456"}

event: message
data: {"type":"response","content":"你好"}

event: finish
data: {"messageId":"789","title":"新对话"}

event: done
data: [DONE]
```

### 异常流程

**场景 1：参数验证失败**
```bash
curl -N http://localhost:9090/api/ragent/rag/v3/chat
```

**响应：**
```
event: error
data: {"error":"Required request parameter 'question' is not present"}
```

**场景 2：服务内部错误**
```bash
curl -N http://localhost:9090/api/ragent/rag/v3/chat?question=测试
```

**响应：**
```
event: error
data: {"error":"知识库不存在"}
```

**场景 3：模型调用失败**

**响应：**
```
event: error
data: {"error":"Ollama 同步请求失败: HTTP 401"}
```

## 异常处理层级

修复后的异常处理有三层保护：

### 第 1 层：Service 层（StreamChatEventHandler）

```java
@Override
public void onError(Throwable t) {
    if (taskManager.isCancelled(taskId)) {
        return;
    }
    taskManager.unregister(taskId);
    sender.fail(t);  // 通过 SseEmitter 发送错误
}
```

### 第 2 层：Controller 层

```java
try {
    ragChatService.streamChat(question, conversationId, deepThinking, modelId, emitter);
} catch (Exception e) {
    handleSseError(emitter, e);  // 捕获启动阶段的异常
}
```

### 第 3 层：GlobalExceptionHandler

```java
@ExceptionHandler(value = Throwable.class)
public Object defaultErrorHandler(HttpServletRequest request, Throwable throwable) {
    if (isSseRequest(request)) {
        return handleSseException(request, throwable);  // 兜底处理
    }
    return Results.failure();
}
```

## 客户端处理示例

### JavaScript (EventSource)

```javascript
const eventSource = new EventSource('/api/ragent/rag/v3/chat?question=你好');

eventSource.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    console.log('收到消息:', data.content);
});

eventSource.addEventListener('error', (e) => {
    const data = JSON.parse(e.data);
    console.error('发生错误:', data.error);
    eventSource.close();
});

eventSource.addEventListener('done', () => {
    console.log('对话完成');
    eventSource.close();
});

eventSource.onerror = (err) => {
    console.error('连接错误:', err);
    eventSource.close();
};
```

### Python (requests)

```python
import requests
import json

response = requests.get(
    'http://localhost:9090/api/ragent/rag/v3/chat',
    params={'question': '你好'},
    stream=True
)

for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('event: '):
            event_type = line[7:]
        elif line.startswith('data: '):
            data = json.loads(line[6:])
            
            if event_type == 'error':
                print(f"错误: {data['error']}")
                break
            elif event_type == 'message':
                print(data['content'], end='', flush=True)
            elif event_type == 'done':
                print("\n对话完成")
                break
```

## 测试验证

### 1. 正常对话测试

```bash
curl -N "http://localhost:9090/api/ragent/rag/v3/chat?question=你好"
```

**预期：** 收到完整的 SSE 流式响应

### 2. 缺少参数测试

```bash
curl -N "http://localhost:9090/api/ragent/rag/v3/chat"
```

**预期：** 收到 `event: error` 事件，而不是 JSON 对象

### 3. 无效模型测试

```bash
curl -N "http://localhost:9090/api/ragent/rag/v3/chat?question=你好&modelId=invalid-model"
```

**预期：** 收到 `event: error` 事件，包含模型不存在的错误信息

### 4. API Key 失效测试

修改配置文件中的 API Key 为无效值，然后：

```bash
curl -N "http://localhost:9090/api/ragent/rag/v3/chat?question=你好"
```

**预期：** 收到 `event: error` 事件，包含认证失败的错误信息

## 注意事项

1. **SSE 请求识别**
   - 通过 `Accept: text/event-stream` 头识别
   - 通过 URI 包含 `/chat` 识别
   - 两种方式任一满足即可

2. **错误消息格式**
   - 统一使用 JSON 格式：`{"error":"错误信息"}`
   - 特殊字符会被转义（`\n`, `\t`, `"` 等）

3. **连接关闭**
   - 发送错误事件后会调用 `emitter.complete()`
   - 客户端应监听 `error` 事件并主动关闭连接

4. **日志记录**
   - 所有 SSE 异常都会记录到日志，标记为 `[SSE异常]`
   - 便于后续排查和监控

## 相关文件

- `framework/src/main/java/.../web/GlobalExceptionHandler.java`
- `bootstrap/src/main/java/.../rag/controller/RAGChatController.java`
- `bootstrap/src/main/java/.../rag/service/handler/StreamChatEventHandler.java`
- `framework/src/main/java/.../web/SseEmitterSender.java`
