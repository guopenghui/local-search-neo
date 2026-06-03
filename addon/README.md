# addon

Neon addon，用于向 Node.js / ZTools preload 暴露 Everything IPC 能力。

底层使用 Rust crate [`everything-ipc`](https://crates.io/crates/everything-ipc)。

## 导出

```js
const { everything } = require("./index.node");
```

类型定义维护在 `index.d.ts`。修改 `src/everything.rs` 导出结构时，需要同步更新该类型文件。

`everything` 包含：

- `isRunning()`
- `isDbLoaded()`
- `getVersion()`
- `query(search, maxResults?, sortMode?)`

`query()` 返回：

```js
{
  total: number,
  items: [
    {
      name,
      path,
      fullPath,
      size,
      modifiedAt,
      attributes,
      isDirectory
    }
  ]
}
```

## 类型

`package.json` 已声明：

```json
{
  "types": "index.d.ts"
}
```

`public/preload/services.js` 通过 JSDoc 引用这里的类型，以便 preload 使用 addon 时获得类型提示。

## 构建

```bash
npm run build
npm run build-release
```

根项目的 `npm run dev` / `npm run build` 会自动编译 addon 并复制 `index.node` 到 `public/addon.node`。

## 简单验证

```bash
npm run test:everything -- "*.exe" 3
```

该脚本会打印导出方法、Everything 状态、版本信息和查询结果。
