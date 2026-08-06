/* 观己 v1.8 真机验证：时段分布环图多彩配色 */
const WebSocket = require('ws');
const PORT = process.env.PORT || '9221';
let id = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  const results = [];
  const check = (name, pass, extra = '') => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
  };

  try {
    /* 浅色模式：环段 5 色 + 列表色点 + 中心数字 */
    await evaljs(ws, `applyTheme('light'); renderHome();`);
    await sleep(400);
    const light = await evaljs(ws, `(() => ({
      segs: [...document.querySelectorAll('#ringChart .ring-seg')].map(s => s.getAttribute('stroke')),
      dots: [...document.querySelectorAll('#ringList .ring-dot')].map(d => d.style.background),
      ringNum: document.querySelector('.ring-num').textContent,
      ringNumColor: getComputedStyle(document.querySelector('.ring-num')).color,
    }))()`);
    const LIGHT = ['#FFCC00', '#FF9500', '#34C759', '#32ADE6', '#007AFF'];
    const LIGHT_RGB = ['rgb(255, 204, 0)', 'rgb(255, 149, 0)', 'rgb(52, 199, 89)', 'rgb(50, 173, 230)', 'rgb(0, 122, 255)'];
    check('浅色 5 段多彩色板', JSON.stringify(light.segs) === JSON.stringify(LIGHT), light.segs.join(' '));
    check('浅色列表色点与环一致', JSON.stringify(light.dots) === JSON.stringify(LIGHT_RGB), light.dots.join(' '));
    check('浅色中心数字黑色', light.ringNumColor === 'rgb(0, 0, 0)', light.ringNumColor);

    /* 深色模式 */
    await evaljs(ws, `applyTheme('dark'); renderHome();`);
    await sleep(400);
    const dark = await evaljs(ws, `(() => ({
      segs: [...document.querySelectorAll('#ringChart .ring-seg')].map(s => s.getAttribute('stroke')),
      dots: [...document.querySelectorAll('#ringList .ring-dot')].map(d => d.style.background),
      ringNumColor: getComputedStyle(document.querySelector('.ring-num')).color,
      ver: document.querySelector('.about-ver') ? 'na' : 'na',
    }))()`);
    const DARK = ['#FFD60A', '#FF9F0A', '#30D158', '#64D2FF', '#0A84FF'];
    const DARK_RGB = ['rgb(255, 214, 10)', 'rgb(255, 159, 10)', 'rgb(48, 209, 88)', 'rgb(100, 210, 255)', 'rgb(10, 132, 255)'];
    check('深色 5 段提亮色板', JSON.stringify(dark.segs) === JSON.stringify(DARK), dark.segs.join(' '));
    check('深色列表色点与环一致', JSON.stringify(dark.dots) === JSON.stringify(DARK_RGB), dark.dots.join(' '));
    check('深色中心数字白色', dark.ringNumColor === 'rgb(255, 255, 255)', dark.ringNumColor);

    /* 版本信息 */
    await evaljs(ws, `document.querySelectorAll('.tab')[2].click()`);
    await sleep(400);
    const ver = await evaljs(ws, `document.querySelector('.about-ver').textContent`);
    check('版本 v1.8', ver.includes('v1.8'), ver);
    await evaljs(ws, `document.querySelectorAll('.tab')[0].click(); applyTheme('system'); renderHome();`);
    await sleep(300);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v1.8 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
