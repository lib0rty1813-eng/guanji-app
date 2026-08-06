/* CDP captureScreenshot：截 WebView 内容（与 DOM 坐标一致）+ 读 rect */
const WebSocket = require('ws');
const fs = require('fs');
const PORT = process.env.PORT || '9221';
let id = 0;

function call(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    const onMsg = (data) => {
      const m = JSON.parse(data);
      if (m.id === msgId) {
        ws.off('message', onMsg);
        if (m.error) reject(new Error(m.error.message));
        else resolve(m.result);
      }
    };
    ws.on('message', onMsg);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

(async () => {
  const pages = await fetch(`http://localhost:${PORT}/json`).then((r) => r.json());
  const p = pages.find((x) => x.type === 'page');
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));

  await call(ws, 'Page.enable');
  const shot = await call(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\43124\\Desktop\\test\\guanji-app\\screenshots\\cdp-full.png', Buffer.from(shot.data, 'base64'));
  console.log('CDP 截图已保存');

  const rect = await call(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('.ring-wrap');
      const r = el.getBoundingClientRect();
      return JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height, theme: document.documentElement.getAttribute('data-theme'), scrollTop: document.getElementById('screen-home').scrollTop });
    })()`,
    returnByValue: true,
  });
  console.log('rect:', rect.result.value);
  ws.close();
  process.exit(0);
})();
