# local-search-neo

借助 Everything 进行本地文件搜索的 ZTools 插件。

## 功能

- 使用 Everything IPC 查询本地文件。
- 支持主搜索面板 `mainPush` 快速预览结果。
- 支持文件类型分类、排序、文本预览和懒加载展示。
- 支持自定义分类和结果过滤器。
- 使用 Neon addon 调用 Rust `everything-ipc`。

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发模式

```bash
npm run dev
```

`dev` 前会自动编译 release addon，并复制到 `public/addon.node`。addon 始终使用 release 构建，以保证性能测试和实际运行一致。

### 构建

```bash
npm run build
```

`build` 前会自动编译 release addon，并复制到 `public/addon.node`。Vite 会把它复制到 `dist/addon.node`。

## 项目结构

```text
.
├── addon/                    # Neon / Rust addon
│   ├── src/everything.rs     # Everything IPC 导出
│   └── package.json
├── public/
│   ├── plugin.json           # ZTools 插件配置
│   └── preload/services.js   # 预加载服务
├── scripts/
│   └── copy-addon.cjs        # 复制 addon 到 public
├── src/
│   ├── App.vue               # 插件入口
│   ├── Finder/               # 文件搜索界面和逻辑
│   ├── assets/               # 前端资源
│   ├── devMock.ts            # 浏览器开发 mock
│   ├── env.d.ts              # 类型声明
│   └── main.ts
├── package.json
└── vite.config.js
```

## addon 调试

```bash
npm run build:addon
npm run test:everything-addon -- --query "*.exe" --max-results 3
```

`test:everything-addon` 会直接 require `addon/index.node` 并验证：

- `isRunning()`
- `isDbLoaded()`
- `getVersion()`
- `query()`

## 运行要求

- Windows
- Node 版本满足 Vite / Neon 构建要求
- Rust 工具链
- Everything 已安装并运行
