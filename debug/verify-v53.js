/* v3.3 真机验证：#54（全屏计时页）+ #55（补记入口回归）+ #56（编辑无 seg） */
const WebSocket = require('ws');
const PORT = process.env.PORT || '9228';
let id = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function evaljs(ws, expr, awaitPromise = false) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    const onMsg = (data) => {
      const m = JSON.parse(data);
      if (m.id === msgId) {
        ws.off('message', onMsg);
        if (m.result && m.result.exceptionDetails) reject(new Error('JS异常: ' + ((m.result.exceptionDetails.exception || {}).description || '?')));
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
    const env = await evaljs(ws, `document.querySelector('.about-ver').textContent`);
    check('版本 v3.3', env.includes('v3.3'), env);

    /* #55：timer 模式 seg 回归 */
    const s1 = await evaljs(ws, `(() => {
      localStorage.removeItem('guanji_timer_v1');
      localStorage.removeItem('guanji_record_mode');
      openSheet('now');
      const r = {
        seg: !document.getElementById('timeSegRow').classList.contains('hidden'),
        nowActive: document.getElementById('nowSeg').classList.contains('active'),
        timerBox: !document.getElementById('timerBox').classList.contains('hidden'),
        next: document.getElementById('nextBtn').textContent,
      };
      return r;
    })()`);
    check('#55 计时模式 seg 回归（就现在=计时器态）', s1.seg && s1.nowActive && s1.timerBox && s1.next === '开始记录', JSON.stringify(s1));

    /* #55：切补记 → 经典流程 */
    const s2 = await evaljs(ws, `(() => {
      document.getElementById('customSeg').click();
      const r = {
        sheetMode,
        picker: !document.getElementById('pickerRow').classList.contains('hidden'),
        timerHidden: document.getElementById('timerBox').classList.contains('hidden'),
        next: document.getElementById('nextBtn').textContent,
      };
      return r;
    })()`);
    check('#55 切补记 → 经典流程', s2.sheetMode === 'backfill' && s2.picker && s2.timerHidden && s2.next === '下一步', JSON.stringify(s2));

    /* #54：开始 → 全屏页 */
    const s3 = await evaljs(ws, `(async () => {
      document.getElementById('nowSeg').click();
      await new Promise(r => setTimeout(r, 200));
      document.getElementById('nextBtn').click();   // 开始记录
      await new Promise(r => setTimeout(r, 2600));
      const r = {
        screen: !document.getElementById('timerScreen').classList.contains('hidden'),
        big: document.getElementById('timerBigDisplay').textContent,
        started: document.getElementById('timerStartedLabel').textContent,
        notifKey: localStorage.getItem('guanji_timer_v1') !== null,
      };
      return r;
    })()`, true);
    check('#54 开始计时 → 全屏沉浸页走秒', s3.screen && s3.big !== '00:00' && s3.started.includes('开始于') && s3.notifKey, JSON.stringify(s3));

    /* #54：结束 → 回面板详情预填 */
    const s4 = await evaljs(ws, `(async () => {
      document.getElementById('timerFinishBtn').click();
      await new Promise(r => setTimeout(r, 500));
      const r = {
        screenHidden: document.getElementById('timerScreen').classList.contains('hidden'),
        details: !document.getElementById('stepDetails').classList.contains('hidden'),
        dur: document.getElementById('durLabel').textContent,
      };
      closeSheet();
      return r;
    })()`, true);
    check('#54 结束 → 回详情预填', s4.screenHidden && s4.details && s4.dur !== '未记录', JSON.stringify(s4));

    /* #54：取消计时按钮 */
    const s5 = await evaljs(ws, `(async () => {
      openSheet('now');
      document.getElementById('nextBtn').click();
      await new Promise(r => setTimeout(r, 1200));
      document.getElementById('timerQuitBtn').click();
      await new Promise(r => setTimeout(r, 600));
      const r = {
        screenHidden: document.getElementById('timerScreen').classList.contains('hidden'),
        sheetHidden: document.getElementById('recordSheet').classList.contains('hidden'),
        toast: document.getElementById('toast').textContent,
      };
      return r;
    })()`, true);
    check('#54 取消计时（无记录+提示）', s5.screenHidden && s5.sheetHidden && s5.toast.includes('已取消'), JSON.stringify(s5));

    /* #56：编辑无 seg */
    const s6 = await evaljs(ws, `(async () => {
      const recs = JSON.parse(localStorage.getItem('guanji_records_v1') || '[]');
      let id;
      if (recs.length > 0) {
        id = recs[recs.length - 1].id;
      } else {
        id = 'rec-' + Date.now();
        recs.push({ id, offset: -1, time: '20:30', duration: 10, moods: [], triggers: [], media: false, note: '' });
        localStorage.setItem('guanji_records_v1', JSON.stringify(recs));
      }
      openEditRecord(id);
      await new Promise(r => setTimeout(r, 500));
      const r = {
        segHidden: document.getElementById('timeSegRow').classList.contains('hidden'),
        picker: !document.getElementById('pickerRow').classList.contains('hidden'),
        details: !document.getElementById('stepDetails').classList.contains('hidden'),
        timerHidden: document.getElementById('timerBox').classList.contains('hidden'),
      };
      closeSheet();
      return r;
    })()`, true);
    check('#56 编辑无「就现在」seg、保留补记时间选择', s6.segHidden && s6.picker && s6.details && s6.timerHidden, JSON.stringify(s6));

    await evaljs(ws, `document.querySelectorAll('.tab')[0].click()`);
    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v3.3 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
