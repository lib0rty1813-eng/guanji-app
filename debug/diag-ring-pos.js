/* 获取环图页面坐标与视口尺寸 */
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
  const r = await evaljs(ws, `(() => {
    const el = document.querySelector('.ring-wrap');
    const rect = el.getBoundingClientRect();
    const svg = el.querySelector('svg').getBoundingClientRect();
    return {
      x: rect.x, y: rect.y, w: rect.width, h: rect.height,
      svgX: svg.x, svgY: svg.y, svgW: svg.width, svgH: svg.height,
      vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio,
      theme: document.documentElement.getAttribute('data-theme'),
    };
  })()`);
  console.log(JSON.stringify(r, null, 2));
  ws.close();
  process.exit(0);
})();
