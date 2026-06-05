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
├── addon/                         # Neon / Rust addon
│   ├── src/
│   │   ├── everything.rs          # Everything IPC 查询导出
│   │   ├── file_tree.rs           # 目录 / 压缩包树打印
│   │   ├── text_preview.rs        # 文本检测和文本预览读取
│   │   └── lib.rs                 # Neon 模块入口
│   ├── index.d.ts                 # addon 导出类型
│   └── package.json
├── public/
│   ├── plugin.json                # ZTools 插件配置
│   └── preload/services.js        # 预加载服务，挂载 window.services
├── scripts/
│   ├── copy-addon.cjs             # 复制 addon 到 public
│   ├── test-everything-addon.cjs  # 验证 addon / Everything 查询
│   └── benchmark-everything-addon.cjs
│                                      # Everything 查询性能压测
├── src/
│   ├── App.vue                    # 插件入口和 mainPush 处理
│   ├── Finder/
│   │   ├── index.vue              # Finder 主布局
│   │   ├── components/            # 侧栏、结果列表、底栏、设置等组件
│   │   ├── composables/           # 搜索、预览、键盘、设置等组合逻辑
│   │   ├── core/                  # 纯逻辑、类型和单测
│   │   └── preview/               # 图片、视频、PDF、文本、目录树等预览组件
│   ├── assets/                    # 前端资源
│   ├── components/                # 通用组件
│   ├── devMock.ts                 # 浏览器开发 mock
│   ├── env.d.ts                   # window.services 等类型声明
│   └── main.ts
├── AGENTS.md                      # Agent 开发提示
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
