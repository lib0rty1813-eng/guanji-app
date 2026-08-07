/* 观己 v2.7 真机验证：#44 退场不透明 / #47 复制菜单·层级·添加流程 */
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
    check('版本 v2.7', ver.includes('v2.7'), ver);

    /* #44 退场转不透明 + 恢复 */
    const r44 = await evaljs(ws, `(async () => {
      openSheet('now');
      const sheet = document.getElementById('recordSheet');
      closeSheet();
      const during = sheet.style.background === 'var(--card)' && sheet.style.backdropFilter === 'none';
      await new Promise(r => setTimeout(r, 400));
      const restored = sheet.style.background === '' && sheet.style.backdropFilter === '';
      return { during, restored };
    })()`, true);
    check('#44 退场背景不透明', r44.during);
    check('#44 结束后恢复玻璃', r44.restored);

    /* #47-1 长按阻止系统菜单（preventDefault + user-select） */
    const r471 = await evaljs(ws, `(() => {
      const chip = document.querySelector('#moodChips .chip');
      const evt = new Event('contextmenu', { cancelable: true, bubbles: true });
      chip.dispatchEvent(evt);
      const pd = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 5 });
      chip.dispatchEvent(pd);
      return {
        contextBlocked: evt.defaultPrevented,
        pointerDownBlocked: pd.defaultPrevented,
        userSelect: getComputedStyle(chip).userSelect,
      };
    })()`);
    check('#47 长按不弹系统菜单', r471.contextBlocked, `user-select=${r471.userSelect}`);

    /* #47-2 弹层层级 */
    const r472 = await evaljs(ws, `(() => ({
      addZ: getComputedStyle(document.getElementById('addBackdrop')).zIndex,
      delZ: getComputedStyle(document.getElementById('delBackdrop')).zIndex,
      sheetZ: getComputedStyle(document.getElementById('recordSheet')).zIndex,
    }))()`);
    check('#47 弹层 z-index 高于面板', r472.addZ === '40' && r472.delZ === '40' && r472.sheetZ === '30', `弹层${r472.addZ} 面板${r472.sheetZ}`);

    /* #47-3 Enter 不提交 + 预览 */
    const r473 = await evaljs(ws, `(async () => {
      openAddDialog('mood');
      const input = document.getElementById('addInput');
      input.value = '真机添加';
      input.dispatchEvent(new Event('input'));
      const preview = document.getElementById('addPreview').textContent;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      const notAdded = !loadCustomList(CUSTOM_MOODS_KEY).includes('真机添加');
      const stillOpen = !document.getElementById('addBackdrop').classList.contains('hidden');
      document.getElementById('addCancel').click();
      return { preview, notAdded, stillOpen };
    })()`, true);
    check('#47 输入预览', r473.preview === '将添加：真机添加', r473.preview);
    check('#47 Enter 不直接提交', r473.notAdded && r473.stillOpen);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v2.7 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
