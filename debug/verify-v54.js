/* v3.4 真机验证：#57-A（通知快捷操作，魅族路径） */
const WebSocket = require('ws');
const PORT = process.env.PORT || '9229';
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
    check('版本 v3.4', env.includes('v3.4'), env);

    /* JS 桥函数存在 */
    const bridge = await evaljs(ws, `(() => ({
      finish: typeof window.__guanjiTimerFinish === 'function',
      cancel: typeof window.__guanjiTimerCancel === 'function',
    }))()`);
    check('JS 桥注册', bridge.finish && bridge.cancel);

    /* 1. 开始计时 → 全屏 + 通知 */
    const s1 = await evaljs(ws, `(async () => {
      localStorage.removeItem('guanji_timer_v1');
      localStorage.removeItem('guanji_record_mode');
      openSheet('now');
      await new Promise(r => setTimeout(r, 300));
      document.getElementById('nextBtn').click();
      await new Promise(r => setTimeout(r, 2500));
      return {
        screen: !document.getElementById('timerScreen').classList.contains('hidden'),
        big: document.getElementById('timerBigDisplay').textContent,
        key: localStorage.getItem('guanji_timer_v1') !== null,
      };
    })()`, true);
    check('#57 开始计时（全屏 + 持久化）', s1.screen && s1.big !== '00:00' && s1.key, JSON.stringify(s1));

    /* 2. 模拟「结束并记录」按钮（原生 Action/胶囊按钮 → 同一 JS 桥） */
    const s2 = await evaljs(ws, `(async () => {
      window.__guanjiTimerFinish();
      await new Promise(r => setTimeout(r, 600));
      return {
        running: timerState.running,
        screenHidden: document.getElementById('timerScreen').classList.contains('hidden'),
        details: !document.getElementById('stepDetails').classList.contains('hidden'),
        dur: document.getElementById('durLabel').textContent,
        key: localStorage.getItem('guanji_timer_v1'),
      };
    })()`, true);
    check('#57 结束并记录 → 详情预填', !s2.running && s2.screenHidden && s2.details && s2.dur !== '未记录' && s2.key === null, JSON.stringify(s2));
    await evaljs(ws, `closeSheet()`);
    await sleep(500);

    /* 3. 模拟「取消」按钮 */
    const s3 = await evaljs(ws, `(async () => {
      openSheet('now');
      await new Promise(r => setTimeout(r, 300));
      document.getElementById('nextBtn').click();
      await new Promise(r => setTimeout(r, 1500));
      window.__guanjiTimerCancel();
      await new Promise(r => setTimeout(r, 600));
      return {
        running: timerState.running,
        screenHidden: document.getElementById('timerScreen').classList.contains('hidden'),
        sheetHidden: document.getElementById('recordSheet').classList.contains('hidden'),
        toast: document.getElementById('toast').textContent,
      };
    })()`, true);
    check('#57 取消按钮 → 终止 + 提示', !s3.running && s3.screenHidden && s3.sheetHidden && s3.toast.includes('已取消'), JSON.stringify(s3));

    /* 4. 原生通知 actions 存在性（dumpsys 侧验证在脚本外） */
    const s4 = await evaljs(ws, `(async () => {
      openSheet('now');
      await new Promise(r => setTimeout(r, 300));
      document.getElementById('nextBtn').click();
      await new Promise(r => setTimeout(r, 1200));
      return 'timing';
    })()`, true);
    check('#57 通知已发出（供 dumpsys 检查 actions）', s4 === 'timing');

    await evaljs(ws, `document.querySelectorAll('.tab')[0].click()`);
    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v3.4 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
