/* 观己 v2.4 真机验证：textZoom UI 修复（趋势胶囊单行 + API 行并排） */
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
    await evaljs(ws, `document.querySelectorAll('.tab')[0].click(); renderHome(); true`);
    await sleep(600);

    /* 版本 */
    const ver = await evaljs(ws, `document.querySelector('.about-ver').textContent`);
    check('版本 v2.4', ver.includes('v2.4'), ver);

    /* 修复 1：趋势胶囊 seg 单行 + 不压缩 */
    const r1 = await evaljs(ws, `(() => {
      const segs = [...document.getElementById('chartSeg').querySelectorAll('.seg')];
      const seg = segs[1];
      const cs = getComputedStyle(seg);
      return {
        nowrap: cs.whiteSpace === 'nowrap',
        oneLine: seg.scrollHeight <= seg.clientHeight + 1,
        shrink0: getComputedStyle(document.getElementById('chartSeg')).flexShrink === '0',
        text: seg.textContent.trim(),
        segW: Math.round(seg.getBoundingClientRect().width),
        segH: Math.round(seg.getBoundingClientRect().height),
      };
    })()`);
    check('#41 胶囊文字单行(nowrap)', r1.nowrap && r1.oneLine, `${r1.text} ${r1.segW}x${r1.segH}`);
    check('#41 胶囊不压缩', r1.shrink0);

    /* 修复 2：API 行保存按钮并排 */
    const r2 = await evaljs(ws, `(() => {
      document.querySelectorAll('.tab')[2].click();
      return new Promise(res => setTimeout(() => {
        const save = document.getElementById('apiKeySave');
        const input = document.getElementById('apiKeyInput');
        const cs = getComputedStyle(save);
        res({
          shrink0: cs.flexShrink === '0',
          inputMinW0: getComputedStyle(input).minWidth === '0px',
          sameLine: save.getBoundingClientRect().top === input.getBoundingClientRect().top,
          saveW: Math.round(save.getBoundingClientRect().width),
        });
      }, 400));
    })()`, true);
    check('#41 API 行按钮不压缩', r2.shrink0 && r2.inputMinW0);
    check('#41 API 行并排', r2.sameLine, `按钮宽 ${r2.saveW}px`);

    /* 快速回归：seg 滑块定位仍正常（14 天默认 active） */
    const r3 = await evaljs(ws, `(() => {
      document.querySelectorAll('.tab')[0].click();
      return new Promise(res => setTimeout(() => {
        const slide = document.getElementById('chartSegSlide');
        const active = document.querySelector('#chartSeg .seg.active');
        const rect = active.getBoundingClientRect();
        const s = slide.getBoundingClientRect();
        res({ active: active.textContent.trim(), slideAligned: Math.abs(s.left - rect.left) < 2 });
      }, 400));
    })()`, true);
    check('#41 滑块跟随正常', r3.slideAligned, r3.active);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v2.4 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
