/* 截图瞬间的状态快照：环图坐标 + 中心文本 + 数据分布 + 主题 */
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
  const s = await evaljs(ws, `(() => {
    const el = document.querySelector('.ring-wrap');
    const rect = el.getBoundingClientRect();
    const buckets = BUCKETS.map((b) => ({ key: b.key, n: 0 }));
    records.forEach((r) => {
      const h = hourOf(r);
      BUCKETS.forEach((b, i) => { if (b.test(h)) buckets[i].n++; });
    });
    return {
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      ringNum: document.querySelector('.ring-num').textContent,
      ringLabel: document.querySelector('.ring-label').textContent,
      theme: document.documentElement.getAttribute('data-theme'),
      total: records.length,
      buckets,
      scrollY: window.scrollY,
      screenTop: document.getElementById('screen-home').scrollTop,
      segs: [...document.querySelectorAll('#ringChart .ring-seg')].map(s => s.style.strokeDasharray),
    };
  })()`);
  console.log(JSON.stringify(s, null, 2));
  ws.close();
  process.exit(0);
})();
