/* CDP clip 精确截图：环图区域 + 周边上下文（放大看结构） */
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
  // 用 clip 截「时段分布卡」整个卡片区域（环图+列表），放大上下文
  const clip = await call(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('.card');
      const ring = document.querySelector('.ring-wrap');
      const r = ring.getBoundingClientRect();
      // 环图区域向外扩 60px 上下文
      const x = Math.max(0, r.x - 60), y = Math.max(0, r.y - 60);
      return JSON.stringify({ x, y, width: r.width + 120, height: r.height + 120 });
    })()`,
    returnByValue: true,
  });
  const c = JSON.parse(clip.result.value);
  console.log('clip:', JSON.stringify(c));

  const shot = await call(ws, 'Page.captureScreenshot', { format: 'png', clip: c });
  fs.writeFileSync('C:\\Users\\43124\\Desktop\\test\\guanji-app\\screenshots\\cdp-clip.png', Buffer.from(shot.data, 'base64'));
  console.log('CDP clip 截图已保存');

  // 再读一次 rect 确认
  const rect = await call(ws, 'Runtime.evaluate', {
    expression: `(() => { const r = document.querySelector('.ring-wrap').getBoundingClientRect(); return JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height, st: document.getElementById('screen-home').scrollTop }); })()`,
    returnByValue: true,
  });
  console.log('rect:', rect.result.value);
  ws.close();
  process.exit(0);
})();
