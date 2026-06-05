const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

if (!fs.existsSync(distDir)) {
  console.log("dist 目录不存在，跳过 addon 清理");
  process.exit(0);
}

const addonPattern = /^addon\.[^.]+\.node$/;
let removedCount = 0;

for (const entry of fs.readdirSync(distDir)) {
  if (!addonPattern.test(entry)) continue;
  fs.rmSync(path.join(distDir, entry), { force: true });
  removedCount += 1;
}

const manifestPath = path.join(distDir, "addon-manifest.json");
if (fs.existsSync(manifestPath)) {
  fs.rmSync(manifestPath, { force: true });
  removedCount += 1;
}

console.log(`已清理 dist addon 临时产物 ${removedCount} 个，发布产物使用 dist/addon.node`);
