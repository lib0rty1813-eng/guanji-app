/* 获取 apiKeyInput 中心坐标（供 adb tap 触发真实键盘） */
const WebSocket = require('ws');
const PORT = process.env.PORT || '9221';
let id = 0;

function evaljs(ws, expr, awaitPromise = false) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    const onMsg = (data) => {
      const m = JSON.parse(data);
      if (m.id === msgId) {
        ws.off('message', onMsg);
        if (m.result && m.result.exceptionDetails) reject(new Error('JS异常: ' + (m.result.exceptionDetails.exception || {}).description));
        else resolve(m.result ? m.result.result.value : undefined);
      }
    };
    ws.on('message', onMsg);
    ws.send(JSON.stringify({ id: msgId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise } }));
  });
}

(async () => {
  const pages = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json());
  const p = pages.find((x) => x.type === 'page');
  if (!p) { console.error('未找到 WebView page'); process.exit(1); }
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));

  await evaljs(ws, `document.querySelectorAll('.tab')[2].click(); true`);
  await new Promise((r) => setTimeout(r, 600));
  const rect = await evaljs(ws, `(() => {
    const el = document.getElementById('apiKeyInput');
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    return { x: Math.round((r.x + r.width / 2) * dpr), y: Math.round((r.y + r.height / 2) * dpr), dpr };
  })()`);
  console.log('TAP=' + rect.x + ',' + rect.y + ' DPR=' + rect.dpr);
  ws.close();
})();
