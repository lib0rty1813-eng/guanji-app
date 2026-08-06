/* v2.5 #42 键盘专项真机验证：真实键盘弹出 → tabbar 隐藏；收起 → 恢复 */
const WebSocket = require('ws');
const { execSync } = require('child_process');
const ADB = 'C:\\Users\\43124\\Android\\platform-tools\\adb.exe';
const SERIAL = process.env.SERIAL || '461QYFDN226NF';
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
    // 切我的页 + 滚动输入框到中部 + 取物理坐标 + 记录基准高度
    const prep = await evaljs(ws, `(() => {
      document.querySelectorAll('.tab')[2].click();
      const el = document.getElementById('apiKeyInput');
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio;
      return {
        tapX: Math.round((r.x + r.width / 2) * dpr),
        tapY: Math.round((r.y + r.height / 2) * dpr),
        baseH: BASE_VIEWPORT_H,
        innerH: window.innerHeight,
      };
    })()`);
    await sleep(600);

    // 真实点击 → 键盘弹出
    execSync(`"${ADB}" -s ${SERIAL} shell input tap ${prep.tapX} ${prep.tapY}`);
    await sleep(1800);

    const during = await evaljs(ws, `(() => ({
      keyboardUp: document.getElementById('tabbar').classList.contains('keyboard-up'),
      innerH: window.innerHeight,
      baseH: BASE_VIEWPORT_H,
      diff: BASE_VIEWPORT_H - window.innerHeight,
    }))()`);
    check('#42 键盘弹出时 tabbar 隐藏', during.keyboardUp, `压缩 ${during.diff}px`);

    // 收键盘（BACK 键优先收键盘）
    execSync(`"${ADB}" -s ${SERIAL} shell input keyevent 4`);
    await sleep(1500);

    const after = await evaljs(ws, `(() => ({
      keyboardUp: document.getElementById('tabbar').classList.contains('keyboard-up'),
      innerH: window.innerHeight,
      diff: BASE_VIEWPORT_H - window.innerHeight,
    }))()`);
    check('#42 键盘收起后恢复', !after.keyboardUp, `压缩 ${after.diff}px`);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== #42 键盘专项验证通过 ===' : '=== 存在失败 ===');
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
