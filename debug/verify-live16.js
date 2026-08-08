/* v3.4 安卓标准 Live Updates 验证（新手机 Android 16） */
const WebSocket = require('ws');
const PORT = process.env.PORT || '9231';
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
    /* 环境 */
    const env = await evaljs(ws, `(() => ({
      ver: document.querySelector('.about-ver').textContent,
      isFlyme: (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TimerLiveUpdate) ? 'plugin-ok' : 'no-plugin',
    }))()`);
    check('版本 v3.4', env.ver.includes('v3.4'), env.ver);

    /* 1. 测试实况通知 → 分级状态（Android 16 新手机 supported 应为 true） */
    const s1 = await evaljs(ws, `(async () => {
      document.querySelectorAll('.tab')[2].click();
      await new Promise(r => setTimeout(r, 500));
      document.getElementById('liveTestBtn').click();
      await new Promise(r => setTimeout(r, 1500));
      const status = document.getElementById('liveTestStatus').textContent;
      const toast = document.getElementById('toast').textContent;
      return { status, toast };
    })()`, true);
    check('#1 测试通知分级状态（应支持提升）', s1.status.includes('支持'), JSON.stringify(s1));

    /* 2. 开始计时 → 全屏 + 通知 */
    const s2 = await evaljs(ws, `(async () => {
      document.querySelectorAll('.tab')[0].click();
      await new Promise(r => setTimeout(r, 400));
      openSheet('now');
      await new Promise(r => setTimeout(r, 300));
      document.getElementById('nextBtn').click();
      await new Promise(r => setTimeout(r, 2000));
      return {
        screen: !document.getElementById('timerScreen').classList.contains('hidden'),
        big: document.getElementById('timerBigDisplay').textContent,
      };
    })()`, true);
    check('#2 开始计时', s2.screen && s2.big !== '00:00', JSON.stringify(s2));

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== 新手机验证完成（提升状态待 dumpsys 确认）===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
