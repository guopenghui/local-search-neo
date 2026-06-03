// 简单验证 Neon addon 暴露的 Everything 调用效果。
// 使用前请先运行：npm --prefix addon run build-release

const { everything } = require("./index.node");

function printTitle(title) {
  console.log(`\n=== ${title} ===`);
}

printTitle("导出方法");
console.log(Object.keys(everything));

printTitle("Everything 运行状态");
console.log("isRunning:", everything.isRunning());
console.log("isDbLoaded:", everything.isDbLoaded());

printTitle("Everything 版本");
try {
  console.log(everything.getVersion());
} catch (error) {
  console.error("getVersion 调用失败:", error.message);
}

printTitle("查询测试");
try {
  const keyword = process.argv[2] || "*.exe";
  const maxResults = Number(process.argv[3] || 5);
  const result = everything.query(keyword, maxResults);

  console.log("keyword:", keyword);
  console.log("maxResults:", maxResults);
  console.log("total:", result.total);
  console.table(result.items);
} catch (error) {
  console.error("query 调用失败:", error.message);
}
