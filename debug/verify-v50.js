/* #50 真机验证：hover 规则包裹 + 触摸 chip 取消选中直接灰字 */
const WebSocket = require('ws');
const { execSync } = require('child_process');
const ADB = 'C:\\Users\\43124\\Android\\platform-tools\\adb.exe';
const SERIAL = process.env.SERIAL || '461QYFDN226NF';
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
  const pages = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json());
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
    await evaljs(ws, `document.querySelectorAll('.tab')[0].click(); renderHome(); true`);
    await sleep(600);

    const ver = await evaljs(ws, `document.querySelector('.about-ver').textContent`);
    check('版本仍 v3.0', ver.includes('v3.0'), ver);

    const css = await evaljs(ws, `(() => {
      let n = 0, outside = 0;
      for (const s of document.styleSheets) {
        try {
          for (const r of s.cssRules) {
            if (r.constructor.name === 'CSSMediaRule' && (r.conditionText || '').includes('hover: hover')) {
              for (const i of r.cssRules) { if (i.selectorText && i.selectorText.includes(':hover')) n++; }
            } else if (r.selectorText && r.selectorText.includes(':hover')) { outside++; }
          }
        } catch (e) {}
      }
      return { inMedia: n, outside };
    })()`);
    check('#50 hover 规则全部包裹', css.inMedia === 16 && css.outside === 0, `媒体内${css.inMedia} 外部${css.outside}`);

    // 打开记录面板第二步（放宽时序：sheetUp 动画 + 内容稳定后再取坐标）
    await evaljs(ws, `document.getElementById('recordBtn').click(); true`);
    await sleep(900);
    await evaljs(ws, `document.getElementById('nextBtn').click(); true`);
    await sleep(600);
    const c = await evaljs(ws, `(() => {
      const chip = [...document.querySelectorAll('#moodChips .chip')].find((x) => x.textContent === '压力');
      const r = chip.getBoundingClientRect();
      const dpr = window.devicePixelRatio;
      return { x: Math.round((r.x + r.width / 2) * dpr), y: Math.round((r.y + r.height / 2) * dpr) };
    })()`);

    // 真实触摸点击两次（选中 + 取消），指针停留在 chip 上
    execSync(`"${ADB}" -s ${SERIAL} shell input tap ${c.x} ${c.y}`);
    await sleep(800);
    const selected = await evaljs(ws, `(() => {
      const chip = [...document.querySelectorAll('#moodChips .chip')].find((x) => x.textContent === '压力');
      return { color: getComputedStyle(chip).color, active: chip.classList.contains('active') };
    })()`);
    check('#50 第一次点击变蓝', selected.active && selected.color === 'rgb(0, 98, 204)', selected.color);

    execSync(`"${ADB}" -s ${SERIAL} shell input tap ${c.x} ${c.y}`);
    await sleep(800);
    const deselected = await evaljs(ws, `(() => {
      const chip = [...document.querySelectorAll('#moodChips .chip')].find((x) => x.textContent === '压力');
      return { color: getComputedStyle(chip).color, active: chip.classList.contains('active') };
    })()`);
    // 修复前此处为黑 rgb(0,0,0)；修复后应直接恢复灰 rgb(142,142,147)
    check('#50 取消选中直接恢复灰字', !deselected.active && deselected.color === 'rgb(142, 142, 147)', deselected.color);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== #50 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
