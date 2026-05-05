# IntelliJ IDEA 项目配置指南

## 问题说明

项目结构已重组，后端代码从根目录移至 `backend/` 目录，导致 IDEA 无法找到主类。

## 解决步骤

### 1. 重新导入 Maven 项目

**方法A：通过 Maven 工具窗口**
1. 打开右侧 Maven 工具窗口
2. 点击刷新按钮（Reload All Maven Projects）
3. 等待 IDEA 重新索引项目

**方法B：重新导入项目**
1. 关闭当前项目（File → Close Project）
2. 在欢迎界面选择 "Open"
3. 选择 `E:\23183\Documents\github\knowflow\backend\pom.xml`
4. 选择 "Open as Project"

### 2. 验证模块加载

打开 Project Structure（File → Project Structure 或 Ctrl+Alt+Shift+S）：
- 检查 Modules 下是否有：framework, infra-ai, bootstrap, mcp-server
- 如果缺失，点击 "+" → "Import Module"，选择 `backend/pom.xml`

### 3. 运行应用

**方法A：使用运行配置**
1. 右上角运行配置下拉菜单选择 "KnowFlowApplication"
2. 点击运行按钮

**方法B：直接运行主类**
1. 打开 `backend/bootstrap/src/main/java/com/nageoffer/ai/knowflow/KnowFlowApplication.java`
2. 右键 → Run 'KnowFlowApplication.main()'

**方法C：使用 Maven 命令**
```bash
cd backend
mvn spring-boot:run -pl bootstrap
```

**方法D：运行打包好的 JAR**
```bash
cd backend
java -jar bootstrap/target/bootstrap-0.0.1-SNAPSHOT.jar
```

### 4. 验证启动成功

访问健康检查端点：
```
http://localhost:9090/api/knowflow/actuator/health
```

应返回：`{"status":"UP"}`

## 项目结构

```
knowflow/
├── backend/              # 后端代码（Maven 项目根目录）
│   ├── pom.xml          # 父 POM
│   ├── framework/       # 基础框架模块
│   ├── infra-ai/        # AI 基础设施模块
│   ├── bootstrap/       # 应用启动模块（包含主类）
│   └── mcp-server/      # MCP 服务器模块
├── frontend/            # 前端代码
├── config/              # 配置文件
└── docs/                # 文档
```

## 常见问题

### Q: 提示 "Cannot resolve symbol 'KnowFlowApplication'"
A: Maven 项目未正确加载，执行步骤1重新导入。

### Q: 运行时提示 "Command line is too long"
A: 运行配置已设置 `SHORTEN_COMMAND_LINE = MANIFEST`，如仍报错，手动修改运行配置选择 "JAR manifest"。

### Q: 依赖无法下载
A: 检查 Maven 配置，确保网络正常，或配置国内镜像源。
