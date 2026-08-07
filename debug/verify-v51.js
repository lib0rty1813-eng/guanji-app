/* 观己 v3.1 真机验证：#51（计时记录 + 实况通知 + 测试） */
const WebSocket = require('ws');
const PORT = process.env.PORT || '9225';
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
    /* 环境：版本 + 插件可用性 */
    const env = await evaljs(ws, `(() => ({
      ver: document.querySelector('.about-ver').textContent,
      timerPlugin: !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TimerLiveUpdate),
      recordMode: localStorage.getItem('guanji_record_mode'),
    }))()`);
    check('版本 v3.1', env.ver.includes('v3.1'), env.ver);
    check('TimerLiveUpdate 插件注册', env.timerPlugin);

    /* 1. 计时模式初始态（清 key 保证默认 timer） */
    const s1 = await evaljs(ws, `(() => {
      localStorage.removeItem('guanji_timer_v1');
      openSheet('now');
      const r = {
        timerBox: !document.getElementById('timerBox').classList.contains('hidden'),
        segHidden: document.getElementById('timeSegRow').classList.contains('hidden'),
        next: document.getElementById('nextBtn').textContent,
        link: document.getElementById('modeLink').textContent,
      };
      closeSheet();
      return r;
    })()`);
    check('计时器态初始（timerBox/seg 隐藏/开始记录）', s1.timerBox && s1.segHidden && s1.next === '开始记录', JSON.stringify(s1));

    /* 2. 开始计时 → 原生通知发出 → 计时递增 → 结束 → 时长预填 */
    const s2 = await evaljs(ws, `(async () => {
      openSheet('now');
      document.getElementById('nextBtn').click();      // 开始记录
      await new Promise(r => setTimeout(r, 3200));
      const t1 = document.getElementById('timerDisplay').textContent;
      const next = document.getElementById('nextBtn').textContent;
      document.getElementById('nextBtn').click();      // 结束记录
      await new Promise(r => setTimeout(r, 500));
      const r = {
        t1, next,
        dur: document.getElementById('durLabel').textContent,
        details: !document.getElementById('stepDetails').classList.contains('hidden'),
        stored: localStorage.getItem('guanji_timer_v1') === null,
      };
      closeSheet();
      return r;
    })()`, true);
    check('计时递增 + 结束预填', s2.t1 !== '00:00' && s2.next === '结束记录' && s2.dur !== '未记录' && s2.details && s2.stored, JSON.stringify(s2));

    /* 3. 中途关闭 = 取消不保存（无记录生成） */
    const before = await evaljs(ws, `JSON.parse(localStorage.getItem('guanji_records_v1') || '[]').length`);
    const s3 = await evaljs(ws, `(async () => {
      openSheet('now');
      document.getElementById('nextBtn').click();
      await new Promise(r => setTimeout(r, 1500));
      closeSheet();
      await new Promise(r => setTimeout(r, 500));
      return {
        toast: document.getElementById('toast').textContent,
        toastVisible: !document.getElementById('toast').classList.contains('hidden'),
        stored: localStorage.getItem('guanji_timer_v1') === null,
      };
    })()`, true);
    const after = await evaljs(ws, `JSON.parse(localStorage.getItem('guanji_records_v1') || '[]').length`);
    check('中途取消（toast/无记录/存储清）', s3.toast.includes('已取消') && s3.stored && before === after, JSON.stringify(s3));

    /* 4. quick 模式 + 对称入口 */
    const s4 = await evaljs(ws, `(() => {
      localStorage.setItem('guanji_record_mode', 'quick');
      openSheet('now');
      const r1 = {
        seg: !document.getElementById('timeSegRow').classList.contains('hidden'),
        timerHidden: document.getElementById('timerBox').classList.contains('hidden'),
        next: document.getElementById('nextBtn').textContent,
        link: document.getElementById('modeLink').textContent,
      };
      document.getElementById('modeLink').click();      // 对称入口
      const r2 = {
        timerBox: !document.getElementById('timerBox').classList.contains('hidden'),
        next: document.getElementById('nextBtn').textContent,
      };
      localStorage.removeItem('guanji_record_mode');
      closeSheet();
      return { r1, r2 };
    })()`);
    check('quick 模式经典流程 + 对称入口', s4.r1.seg && s4.r1.timerHidden && s4.r1.next === '下一步' && s4.r1.link.includes('精准计时') && s4.r2.timerBox && s4.r2.next === '开始记录', JSON.stringify(s4));

    /* 5. 实况通知测试（真机走原生插件） */
    const s5 = await evaljs(ws, `(async () => {
      document.querySelectorAll('.tab')[2].click();
      await new Promise(r => setTimeout(r, 500));
      document.getElementById('liveTestBtn').click();
      await new Promise(r => setTimeout(r, 1200));
      const status = document.getElementById('liveTestStatus').textContent;
      return { status, toast: document.getElementById('toast').textContent };
    })()`, true);
    check('实况通知测试（原生分级状态）', s5.status.includes('系统：') && s5.status.includes('通知权限：'), JSON.stringify(s5));

    /* 6. 补记/编辑回归 */
    const s6 = await evaljs(ws, `(() => {
      document.querySelectorAll('.tab')[0].click();
      openSheet('backfill');
      const r = {
        seg: !document.getElementById('timeSegRow').classList.contains('hidden'),
        picker: !document.getElementById('pickerRow').classList.contains('hidden'),
        timerHidden: document.getElementById('timerBox').classList.contains('hidden'),
        next: document.getElementById('nextBtn').textContent,
      };
      closeSheet();
      return r;
    })()`);
    check('补记回归（seg/picker/无计时器）', s6.seg && s6.picker && s6.timerHidden && s6.next === '下一步', JSON.stringify(s6));

    await evaljs(ws, `document.querySelectorAll('.tab')[0].click()`);
    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v3.1 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
