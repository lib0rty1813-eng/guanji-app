/* 观己 v2.6 真机验证：#44 退场毛玻璃 / #45 深色图标 / #46 编辑单页 / #47 长按删除 */
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
    check('版本 v2.6', ver.includes('v2.6'), ver);

    /* #44 退场动画期间毛玻璃关闭 + 结束后恢复 */
    const r44 = await evaljs(ws, `(async () => {
      openSheet('now');
      const sheet = document.getElementById('recordSheet');
      closeSheet();
      const during = sheet.style.backdropFilter === 'none';
      await new Promise(r => setTimeout(r, 400));
      const restored = sheet.style.backdropFilter === '';
      return { during, restored };
    })()`, true);
    check('#44 退场时毛玻璃关闭', r44.during);
    check('#44 结束后恢复', r44.restored);

    /* #45 深色模式图标可读 */
    const r45 = await evaljs(ws, `(() => {
      document.documentElement.dataset.theme = 'dark';
      const btn = document.getElementById('backfillBtn');
      const color = getComputedStyle(btn).color;
      const stroke = document.querySelector('#backfillBtn svg rect').getAttribute('stroke');
      document.documentElement.dataset.theme = '';
      return { color, stroke };
    })()`);
    check('#45 图标 currentColor', r45.stroke === 'currentColor');
    check('#45 深色下浅色可见', r45.color === 'rgb(255, 255, 255)', r45.color);

    /* #46 编辑直达详情（单页） */
    const r46 = await evaljs(ws, `(async () => {
      const btn = document.querySelector('#recentList .recent-edit');
      if (!btn) return null;
      btn.click();
      await new Promise(r => setTimeout(r, 300));
      return {
        details: !document.getElementById('stepDetails').classList.contains('hidden'),
        stepTime: !document.getElementById('stepTime').classList.contains('hidden'),
        save: !document.getElementById('saveBtn').classList.contains('hidden'),
        nextHidden: document.getElementById('nextBtn').classList.contains('hidden'),
      };
    })()`, true);
    check('#46 编辑直达详情', r46 && r46.details && r46.save && r46.nextHidden, `stepTime=${r46 && r46.stepTime}`);
    if (r46) await evaljs(ws, `closeSheet(); true`);
    await sleep(400);

    /* #47 字数提示 + 长按删除 */
    const r47 = await evaljs(ws, `(async () => {
      openAddDialog('mood');
      const input = document.getElementById('addInput');
      input.value = '真机测试项';
      input.dispatchEvent(new Event('input'));
      const count = document.getElementById('addCount').textContent;
      document.getElementById('addConfirm').click();
      const chip = [...document.querySelectorAll('#moodChips .chip')].find(c => c.textContent === '真机测试项');
      const marked = chip ? chip.dataset.custom === '1' : null;
      chip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
      await new Promise(r => setTimeout(r, 700));
      const dialogShown = !document.getElementById('delBackdrop').classList.contains('hidden');
      document.getElementById('delConfirm').click();
      const deleted = !loadCustomList(CUSTOM_MOODS_KEY).includes('真机测试项');
      return { count, marked, dialogShown, deleted };
    })()`, true);
    check('#47 字数提示', r47.count === '5/6', r47.count);
    check('#47 自定义项标记', r47.marked === true);
    check('#47 长按弹出删除确认', r47.dialogShown);
    check('#47 删除生效', r47.deleted);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v2.6 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
