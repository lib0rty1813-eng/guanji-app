/* 诊断 #21：点击 30 天后 chartDays / active / 滑块 */
const WebSocket = require('ws');
const PORT = process.env.PORT || '9221';
let id = 0;

function evaljs(ws, expr) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    const onMsg = (data) => {
      const m = JSON.parse(data);
      if (m.id === msgId) {
        ws.off('message', onMsg);
        if (m.result && m.result.exceptionDetails) reject(new Error('JS异常: ' + JSON.stringify(m.result.exceptionDetails)));
        else resolve(m.result ? m.result.result.value : undefined);
      }
    };
    ws.on('message', onMsg);
    ws.send(JSON.stringify({ id: msgId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
  });
}

(async () => {
  const pages = await fetch(`http://localhost:${PORT}/json`).then((r) => r.json());
  const p = pages.find((x) => x.type === 'page');
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));
  try {
    const r = await evaljs(ws, `(() => {
      const seg30 = document.querySelector('#chartSeg .seg[data-days="30"]');
      const before = { chartDays, active: document.querySelector('#chartSeg .seg.active') ? document.querySelector('#chartSeg .seg.active').textContent : 'none' };
      seg30.click();
      const after = { chartDays, active: document.querySelector('#chartSeg .seg.active') ? document.querySelector('#chartSeg .seg.active').textContent : 'none', left: document.getElementById('chartSegSlide').style.left };
      // 手动调用 moveSegSlide 测试函数本身
      let manual = null;
      try {
        moveSegSlide(document.getElementById('chartSeg'), document.getElementById('chartSegSlide'), seg30);
        manual = document.getElementById('chartSegSlide').style.left;
      } catch (e) { manual = 'ERR:' + e.message; }
      return { before, after, manual };
    })()`);
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
  ws.close();
  process.exit(0);
})();
