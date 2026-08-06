/* v1.9 真机验证：环图修复后 canvas 像素级验证（渲染完整性） */
const WebSocket = require('ws');
const PORT = process.env.PORT || '9221';
let id = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const pages = await fetch(`http://localhost:${PORT}/json`).then((r) => r.json());
  const p = pages.find((x) => x.type === 'page');
  if (!p) { console.error('未找到 WebView page'); process.exit(1); }
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));

  const results = [];
  const check = (name, pass, extra = '') => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
  };

  try {
    // 等页面就绪 + 渲染
    await evaljs(ws, `document.querySelectorAll('.tab')[0].click(); renderHome(); true`);
    await sleep(800);

    /* 1. dasharray 值（修复后 gap=282.7 真实周长） */
    const segs = await evaljs(ws, `[...document.querySelectorAll('#ringChart .ring-seg')].map(s => s.style.strokeDasharray)`);
    check('dasharray gap=真实周长 282.7', JSON.stringify(segs) === JSON.stringify(['0, 282.7', '0, 282.7', '31.3, 282.7', '66.7, 282.7', '172.7, 282.7']), segs.join(' | '));

    /* 2. canvas 像素级：环带 360° 采样（浏览器自己渲染） */
    const canvas = await evaljs(ws, `(async () => {
      const svg = document.querySelector('#ringChart svg');
      const xml = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([xml], { type: 'image/svg+xml' });
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await new Promise((res) => { img.onload = res; img.onerror = res; });
      const S = 240;
      const canvas = document.createElement('canvas');
      canvas.width = S; canvas.height = S;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S, S);
      ctx.drawImage(img, 0, 0, S, S);
      const data = ctx.getImageData(0, 0, S, S).data;
      const cx = S/2, cy = S/2, R = 90, HALF = 24;
      const px = (x, y) => { const i = (Math.round(y) * S + Math.round(x)) * 4; return [data[i], data[i+1], data[i+2]]; };
      const dist = (a, b) => Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
      const sample = (deg) => {
        let best = null;
        for (let k = -3; k <= 3; k++) {
          const r = R + HALF * (k / 3.5);
          const x = cx + r * Math.cos(deg * Math.PI / 180);
          const y = cy + r * Math.sin(deg * Math.PI / 180);
          const p2 = px(x, y);
          if (!best || dist(p2, [255,255,255]) > dist(best, [255,255,255])) best = p2;
        }
        return best;
      };
      const KNOWN = { '青': [50,173,230], '蓝': [0,122,255], '绿': [52,199,89], '黄': [255,204,0], '橙': [255,149,0] };
      const classify = (p2) => {
        if (dist(p2, [255,255,255]) < 20) return '.';
        let bn = '?', bd = 1e9;
        for (const [n, c] of Object.entries(KNOWN)) { const d = dist(p2, c); if (d < bd) { bn = n; bd = d; } }
        return bd < 45 ? bn : 'X';
      };
      let line = '';
      for (let deg = 0; deg < 360; deg += 10) line += classify(sample(deg)) + (deg % 90 === 80 ? '|' : '');
      // 关键位置细采样
      const key = {};
      for (const deg of [10, 60, 120, 240, 275, 320, 340]) key[deg] = classify(sample(deg));
      return { line, key };
    })()`, true);

    console.log('canvas 环带采样:', canvas.line);
    // 断言：深夜蓝 40°-260° 连续（检查 45/120/250 都是蓝，260 为边界，270 绿段）
    const isBlue = (d) => d === '蓝';
    check('深夜蓝弧连续完整（60°/120°/240° 均蓝）', isBlue(canvas.key[60]) && isBlue(canvas.key[120]) && isBlue(canvas.key[240]), JSON.stringify(canvas.key));
    check('下午绿段（275°）', canvas.key[275] === '绿', canvas.key[275]);
    check('傍晚青段起点（320°）', canvas.key[320] === '青', canvas.key[320]);
    check('傍晚青段跨0（10°/340°）', canvas.key[10] === '青' && canvas.key[340] === '青', canvas.key[10] + '/' + canvas.key[340]);

    /* 3. 版本 */
    await evaljs(ws, `document.querySelectorAll('.tab')[2].click()`);
    await sleep(400);
    const ver = await evaljs(ws, `document.querySelector('.about-ver').textContent`);
    check('版本 v1.9', ver.includes('v1.9'), ver);
    await evaljs(ws, `document.querySelectorAll('.tab')[0].click()`);
    await sleep(300);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v1.9 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();

