/* 诊断 #13 提醒开关：mock 权限后点击，检查保存路径 */
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
        if (m.result && m.result.exceptionDetails) reject(new Error('JS异常: ' + JSON.stringify(m.result.exceptionDetails.exception)));
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
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));

  try {
    console.log('isNativeApp:', await evaljs(ws, 'isNativeApp()'));
    console.log('LN 存在:', await evaljs(ws, '!!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications)'));
    console.log('当前 reminder:', await evaljs(ws, `localStorage.getItem('guanji_reminder')`));

    const r = await evaljs(ws, `(async () => {
      const LN = window.Capacitor.Plugins.LocalNotifications;
      const orig = LN.requestPermissions;
      LN.requestPermissions = () => Promise.resolve({ display: 'granted' });
      const s0 = JSON.parse(localStorage.getItem('guanji_reminder') || 'null');
      document.getElementById('reminderSwitch').click();
      await new Promise((r) => setTimeout(r, 1500));
      const s1 = JSON.parse(localStorage.getItem('guanji_reminder') || 'null');
      const swOn = document.getElementById('reminderSwitch').classList.contains('on');
      const rowVisible = !document.getElementById('reminderTimeRow').classList.contains('hidden');
      LN.requestPermissions = orig;
      return { s0, s1, swOn, rowVisible };
    })()`, true);

    console.log('结果:', JSON.stringify(r, null, 2));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
  ws.close();
  process.exit(0);
})();
