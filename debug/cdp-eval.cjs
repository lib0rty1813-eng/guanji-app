// 用法: node cdp-eval.cjs <js文件> [参数]   —— 在 app WebView 页面执行 js 文件内容并打印 JSON 结果
// [参数] 会以全局变量 __ARG 注入页面（js 内读 __ARG）
const http = require('http');
const fs = require('fs');

function getTargets() {
  return new Promise((res, rej) => {
    http.get('http://127.0.0.1:9227/json', (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

(async () => {
  const targets = await getTargets();
  const page = targets.find((t) => t.type === 'page');
  if (!page) { console.error('NO_PAGE_TARGET', JSON.stringify(targets)); process.exit(1); }
  const WebSocket = require(require('path').join(process.env.CDP_WS || 'C:/Users/43124/ZCodeProject/node_modules', 'ws'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const js = fs.readFileSync(process.argv[2], 'utf8');
  const expr = 'var __ARG = ' + JSON.stringify(process.argv[3] || null) + ';\n' + js;
  ws.on('open', () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: expr, returnByValue: true, awaitPromise: true }
    }));
  });
  ws.on('message', (d) => {
    const m = JSON.parse(d);
    if (m.id === 1) {
      if (m.result && m.result.exceptionDetails) {
        console.error('EXCEPTION:', JSON.stringify(m.result.exceptionDetails, null, 2));
      } else {
        console.log(JSON.stringify(m.result && m.result.result && m.result.result.value, null, 2));
      }
      ws.close();
      process.exit(0);
    }
  });
  ws.on('error', (e) => { console.error('WS_ERR', e.message); process.exit(1); });
  setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 15000);
})();
