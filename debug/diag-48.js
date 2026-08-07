/* #48 定位：真机触摸编辑按钮 → 拖拽退出 → 检查焦点残留（输出坐标供 adb 操作） */
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

  await evaljs(ws, `document.querySelectorAll('.tab')[0].click(); renderHome(); true`);
  await new Promise((r) => setTimeout(r, 600));

  const coords = await evaljs(ws, `(() => {
    const btn = document.querySelector('#recentList .recent-edit');
    btn.scrollIntoView({ block: 'center' });
    const b = btn.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    return {
      btnX: Math.round((b.x + b.width / 2) * dpr),
      btnY: Math.round((b.y + b.height / 2) * dpr),
    };
  })()`);
  console.log('TAP_BTN=' + coords.btnX + ',' + coords.btnY);
  ws.close();
})();
