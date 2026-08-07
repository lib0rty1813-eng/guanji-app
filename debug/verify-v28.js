/* 观己 v2.8 真机验证：#44 退场只下滑 / #47 偏上·预览·×按钮删除 */
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
    check('版本 v2.8', ver.includes('v2.8'), ver);

    /* #44 退场只下滑（无 opacity） */
    const r44 = await evaljs(ws, `(async () => {
      openSheet('now');
      const sheet = document.getElementById('recordSheet');
      closeSheet();
      const during = {
        noOpacityInline: sheet.style.opacity === '',
        transitionOnlyTransform: sheet.style.transition.startsWith('transform'),
        bgOpaque: sheet.style.background === 'var(--card)',
      };
      await new Promise(r => setTimeout(r, 400));
      const restored = sheet.style.background === '' && sheet.style.transform === '';
      return { during, restored };
    })()`, true);
    check('#44 退场无 opacity 过渡', r44.during.noOpacityInline && r44.during.transitionOnlyTransform);
    check('#44 退场不透明下滑', r44.during.bgOpaque);
    check('#44 动画后恢复', r44.restored);

    /* #47 预览清空 + 无 kb */
    const r47a = await evaljs(ws, `(() => {
      openAddDialog('mood');
      const cleared = document.getElementById('addPreview').textContent === '' && document.getElementById('addCount').textContent === '';
      document.getElementById('addCancel').click();
      return cleared;
    })()`);
    check('#47 预览与字数清空', r47a);

    /* #47 × 按钮删除全流程 */
    const r47b = await evaljs(ws, `(async () => {
      openAddDialog('mood');
      const input = document.getElementById('addInput');
      input.value = '真机补丁';
      input.dispatchEvent(new Event('input'));
      document.getElementById('addConfirm').click();
      const chip = [...document.querySelectorAll('#moodChips .chip')].find(c => c.textContent.includes('真机补丁'));
      const hasX = !!chip.querySelector('.chip-x');
      const builtinNoX = ![...document.querySelectorAll('#moodChips .chip')].find(c => c.textContent.trim() === '平静').querySelector('.chip-x');
      chip.querySelector('.chip-x').click();
      const dialogShown = !document.getElementById('delBackdrop').classList.contains('hidden');
      const delText = document.getElementById('delDialogText').textContent;
      document.getElementById('delConfirm').click();
      const deleted = !loadCustomList(CUSTOM_MOODS_KEY).includes('真机补丁');
      const removedUI = ![...document.querySelectorAll('#moodChips .chip')].some(c => c.textContent.includes('真机补丁'));
      return { hasX, builtinNoX, dialogShown, delText, deleted, removedUI };
    })()`, true);
    check('#47 × 按钮仅自定义项', r47b.hasX && r47b.builtinNoX);
    check('#47 × 点击弹删除确认', r47b.dialogShown, r47b.delText);
    check('#47 删除生效', r47b.deleted && r47b.removedUI);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v2.8 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
