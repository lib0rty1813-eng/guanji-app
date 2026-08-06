/* 观己 v2.3 真机验证：#37（原生，logcat 侧）/ #38（编辑+自动重生成）/ #39 / #40 */
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
    /* 准备：我的页恢复演示数据 */
    await evaljs(ws, `document.querySelectorAll('.tab')[2].click(); true`);
    await sleep(400);
    await evaljs(ws, `document.getElementById('restoreBtn').click(); true`);
    await sleep(500);
    await evaljs(ws, `document.querySelectorAll('.tab')[0].click(); true`);
    await sleep(500);

    /* 版本 */
    const ver = await evaljs(ws, `document.querySelector('.about-ver').textContent`);
    check('版本 v2.3', ver.includes('v2.3'), ver);

    /* #38-1 首页最近记录编辑按钮 */
    const r1 = await evaljs(ws, `(() => ({
      edit: document.querySelectorAll('#recentList .recent-edit').length,
      del: document.querySelectorAll('#recentList .recent-del').length
    }))()`);
    check('#38 最近记录编辑按钮并排', r1.edit > 0 && r1.edit === r1.del, `${r1.edit}编辑/${r1.del}删除`);

    /* #38-2 点击编辑 → 面板预填 */
    const r2 = await evaljs(ws, `(() => {
      const firstId = document.querySelector('#recentList .recent-edit').dataset.id;
      const rec = records.find(r => r.id === firstId);
      document.querySelector('#recentList .recent-edit').click();
      return new Promise(res => setTimeout(() => res({
        mode: sheetMode,
        pickTime: document.getElementById('pickTime').value,
        activeMoods: [...document.querySelectorAll('#moodChips .chip.active')].map(c => c.textContent),
        durLabel: document.getElementById('durLabel').textContent,
        recMoods: rec.moods, recTime: rec.time, recDur: rec.duration
      }), 300));
    })()`, true);
    check('#38 编辑面板预填(模式/时间)', r2.mode === 'edit' && r2.pickTime === r2.recTime, `${r2.pickTime}`);
    check('#38 编辑面板预填(情绪)', JSON.stringify(r2.activeMoods) === JSON.stringify(r2.recMoods || []), `${r2.activeMoods.join(',')}`);
    check('#38 编辑面板预填(时长)', r2.durLabel === (r2.recDur ? r2.recDur + ' 分钟' : '未记录'), r2.durLabel);

    /* #38-3 保存 → 原地更新无重复 */
    const r3 = await evaljs(ws, `(() => {
      const id = editingId;
      const countBefore = records.length;
      document.getElementById('nextBtn').click();
      document.getElementById('noteInput').value = '真机编辑验证';
      document.getElementById('saveBtn').click();
      return new Promise(res => setTimeout(() => {
        const rec = records.find(r => r.id === id);
        res({
          countBefore, countAfter: records.length,
          note: rec ? rec.note : null,
          editingId: editingId,
          toast: document.getElementById('toast').textContent
        });
      }, 400));
    })()`, true);
    check('#38 保存原地更新(无重复)', r3.countBefore === r3.countAfter && r3.note === '真机编辑验证', `${r3.countBefore}→${r3.countAfter}`);
    check('#38 toast 已更新', r3.toast === '已更新 ✓', r3.toast);
    check('#38 editingId 复位', r3.editingId === null);

    /* #38-4 日历列表编辑入口 */
    const r4 = await evaljs(ws, `(() => {
      document.getElementById('backfillBtn').click();
      let detail = document.getElementById('calDayDetail');
      if (!detail.querySelector('.recent-edit')) {
        const hasCell = document.querySelector('#calGrid .cal-cell.has');
        if (hasCell) hasCell.click();
        detail = document.getElementById('calDayDetail');
      }
      const hasEdit = !!detail.querySelector('.recent-edit');
      document.getElementById('calClose').click();
      return new Promise(res => setTimeout(() => res({ hasEdit, calClosed: document.getElementById('calendarSheet').classList.contains('hidden') }), 400));
    })()`, true);
    check('#38 日历明细有编辑按钮', r4.hasEdit);
    check('#38 日历正常关闭', r4.calClosed);

    /* #40 保存按钮样式（浅色黑字+边框 / 深色白字+边框） */
    const r5 = await evaljs(ws, `(() => {
      document.querySelectorAll('.tab')[2].click();
      return new Promise(res => setTimeout(() => {
        const save = document.getElementById('apiKeySave');
        const cs = getComputedStyle(save);
        res({ color: cs.color, border: cs.borderWidth, theme: document.documentElement.dataset.theme });
      }, 400));
    })()`, true);
    const ghostColorOK = r5.theme === 'dark' ? r5.color === 'rgb(255, 255, 255)' : r5.color === 'rgb(0, 0, 0)';
    check('#40 ghost 按钮主文字色', ghostColorOK, r5.color);
    check('#40 ghost 按钮边框', parseFloat(r5.border) > 0, r5.border);

    await evaljs(ws, `document.querySelectorAll('.tab')[0].click();`);
    await sleep(300);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v2.3 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
