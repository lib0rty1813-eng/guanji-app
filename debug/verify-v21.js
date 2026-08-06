/* 观己 v2.1 真机验证：#28/#29/#30/#31 */
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

    /* #28 自适应 + 过渡 */
    const r28 = await evaljs(ws, `(async () => {
      openSheet('now');
      const step1h = document.getElementById('stepTime').getBoundingClientRect().height;
      const h0 = document.getElementById('recordSheet').getBoundingClientRect().height;
      document.getElementById('nextBtn').click();
      await new Promise(r => setTimeout(r, 500));
      const cleaned = document.getElementById('recordSheet').style.height === '';
      const h1 = document.getElementById('recordSheet').getBoundingClientRect().height;
      document.getElementById('prevBtn').click();
      await new Promise(r => setTimeout(r, 500));
      const h2 = document.getElementById('recordSheet').getBoundingClientRect().height;
      closeSheet();
      await new Promise(r => setTimeout(r, 350));
      return { step1h, h0, h1, h2, cleaned };
    })()`, true);
    check('#28 步骤1 紧凑', r28.step1h < 300, r28.step1h.toFixed(0) + 'px');
    check('#28 步骤2 自然高度', r28.h1 > r28.h0 + 200, (r28.h1 - r28.h0).toFixed(0) + 'px 差');
    check('#28 过渡后内联清理', r28.cleaned);

    /* #29 退场动画 + 拖拽 */
    const r29 = await evaljs(ws, `(async () => {
      openSheet('now');
      const sheet = document.getElementById('recordSheet');
      closeSheet();
      const notImmediate = !sheet.classList.contains('hidden');
      await new Promise(r => setTimeout(r, 350));
      const closed = sheet.classList.contains('hidden');
      // 拖拽超阈值
      openSheet('now');
      const grab = document.getElementById('recordGrab');
      grab.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, pointerId: 1, bubbles: true }));
      grab.dispatchEvent(new PointerEvent('pointermove', { clientY: 250, pointerId: 1, bubbles: true }));
      const followed = sheet.style.transform.includes('150');
      grab.dispatchEvent(new PointerEvent('pointerup', { clientY: 250, pointerId: 1, bubbles: true }));
      await new Promise(r => setTimeout(r, 350));
      const dragClosed = sheet.classList.contains('hidden');
      // 回弹
      openSheet('now');
      grab.dispatchEvent(new PointerEvent('pointerdown', { clientY: 100, pointerId: 2, bubbles: true }));
      grab.dispatchEvent(new PointerEvent('pointermove', { clientY: 140, pointerId: 2, bubbles: true }));
      grab.dispatchEvent(new PointerEvent('pointerup', { clientY: 140, pointerId: 2, bubbles: true }));
      await new Promise(r => setTimeout(r, 400));
      const bounced = !sheet.classList.contains('hidden') && sheet.style.transform === '';
      closeSheet();
      await new Promise(r => setTimeout(r, 350));
      return { notImmediate, closed, followed, dragClosed, bounced };
    })()`, true);
    check('#29 退场动画（关闭非瞬隐）', r29.notImmediate && r29.closed);
    check('#29 拖拽跟随', r29.followed);
    check('#29 拖拽超阈值关闭', r29.dragClosed);
    check('#29 拖拽未达阈值回弹', r29.bounced);

    /* #30 label 间距 */
    await evaljs(ws, `document.querySelectorAll('.tab')[2].click()`);
    await sleep(400);
    const r30 = await evaljs(ws, `(() => {
      const card = [...document.querySelectorAll('.card')].find(c => c.textContent.includes('AI 设置'));
      return [...card.querySelectorAll('.field-label')].map(l => ({ t: l.textContent.trim(), mt: getComputedStyle(l).marginTop, inline: !!l.getAttribute('style') }));
    })()`);
    check('#30 label 统一 16px 上间距', r30.every((l, i) => (i === 0 ? l.mt === '0px' : l.mt === '16px')) && r30.every(l => !l.inline), r30.map(l => l.t + ':' + l.mt).join(' '));

    /* #31 提醒时间清空恢复 */
    const r31 = await evaljs(ws, `(() => {
      const t = document.getElementById('reminderTime');
      t.value = '';
      t.dispatchEvent(new Event('change'));
      return t.value;
    })()`);
    check('#31 清空恢复 21:00', r31 === '21:00', r31);

    /* 版本 */
    const ver = await evaljs(ws, `document.querySelector('.about-ver').textContent`);
    check('版本 v2.1', ver.includes('v2.1'), ver);

    await evaljs(ws, `document.querySelectorAll('.tab')[0].click()`);
    await sleep(300);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v2.1 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
