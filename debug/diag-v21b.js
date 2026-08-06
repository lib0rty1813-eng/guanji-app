/* 诊断：两个 seg 的 rect */
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
      const row = document.getElementById('chartSeg');
      const rr = row.getBoundingClientRect();
      const s14 = document.querySelector('#chartSeg .seg[data-days="14"]').getBoundingClientRect();
      const s30 = document.querySelector('#chartSeg .seg[data-days="30"]').getBoundingClientRect();
      const slide = document.getElementById('chartSegSlide');
      const slideRect = slide.getBoundingClientRect();
      return {
        row: { left: rr.left, width: rr.width },
        s14: { left: s14.left, width: s14.width },
        s30: { left: s30.left, width: s30.width },
        slideLeft: slide.style.left, slideRectLeft: slideRect.left,
        rowFlex: getComputedStyle(row).display,
      };
    })()`);
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
  ws.close();
  process.exit(0);
})();
