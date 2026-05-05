# RAGent Frontend

RAGent 前端应用 - 基于 React 的智能对话界面

## 技术栈

- **React 18**
- **TypeScript**
- **Vite** - 构建工具
- **Ant Design** - UI组件库
- **Axios** - HTTP客户端

## 功能特性

- 流式对话界面（SSE）
- 知识库管理
- 文档上传与处理
- 模型切换
- 快捷命令（/upload, #keyword, @model）
- 三栏布局（侧边栏 + 对话区 + 功能面板）

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
yarn install
```

### 2. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 3. 构建生产版本

```bash
npm run build
# 或
yarn build
```

### 4. 使用启动脚本

```bash
# Windows
../scripts/start-frontend.cmd

# PowerShell
../scripts/start-frontend.ps1
```

## 访问地址

- **开发环境**: http://localhost:5173
- **生产环境**: 根据部署配置

## 项目结构

```
frontend/
├── src/
│   ├── components/     # React组件
│   ├── services/       # API服务
│   ├── utils/          # 工具函数
│   ├── types/          # TypeScript类型定义
│   ├── App.tsx         # 主应用组件
│   └── main.tsx        # 入口文件
├── public/             # 静态资源
├── package.json        # NPM配置
└── vite.config.ts      # Vite配置
```

## 环境变量

创建 `.env.local` 文件配置后端API地址：

```bash
VITE_API_BASE_URL=http://localhost:9090/api/ragent
```

## 开发指南

### 代码规范

项目使用 ESLint 和 Prettier 进行代码检查和格式化：

```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化
npm run format
```

### 组件开发

- 使用函数式组件和 Hooks
- 遵循 React 最佳实践
- 组件文件使用 PascalCase 命名
- 样式文件使用 CSS Modules

## 文档

- [前端架构说明](../docs/wiki/03-系统架构说明.md)
- [API接口文档](../docs/api/)

## License

见项目根目录 [LICENSE](../LICENSE)
