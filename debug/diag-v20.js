/* 诊断 v2.0 真机：#21 滑块 left/width + #23 步骤高度 */
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
        if (m.result && m.result.exceptionDetails) reject(new Error('JS异常: ' + (m.result.exceptionDetails.exception || {}).description));
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

  const r1 = await evaljs(ws, `(() => {
    const slide = document.getElementById('chartSegSlide');
    const left0 = slide.style.left, w0 = slide.style.width;
    document.querySelector('#chartSeg .seg[data-days="30"]').click();
    const r = { left0, w0, left1: slide.style.left, w1: slide.style.width };
    document.querySelector('#chartSeg .seg[data-days="14"]').click();
    return r;
  })()`);
  console.log('#21 滑块:', JSON.stringify(r1));

  const r2 = await evaljs(ws, `(() => {
    openSheet('now');
    const s1 = document.getElementById('stepTime').getBoundingClientRect().height;
    const sheet1 = document.getElementById('recordSheet').getBoundingClientRect().height;
    document.getElementById('nextBtn').click();
    const s2 = document.getElementById('stepDetails').getBoundingClientRect().height;
    const sheet2 = document.getElementById('recordSheet').getBoundingClientRect().height;
    closeSheet();
    return { step1: s1, step2: s2, sheet1, sheet2 };
  })()`);
  console.log('#23 步骤高度:', JSON.stringify(r2));
  ws.close();
  process.exit(0);
})();
