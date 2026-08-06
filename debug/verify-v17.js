/* 观己 v1.7 真机验证：问候语拆层 + 隐私文案删除 */
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
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));

  const results = [];
  const check = (name, pass, extra = '') => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
  };

  try {
    /* 拆层：标题一行时段问候 */
    const home = await evaljs(ws, `(() => {
      const t = document.getElementById('greetingTitle');
      const tip = document.getElementById('greetingTip');
      return {
        title: t.textContent,
        titleHeight: t.getBoundingClientRect().height,
        tipText: tip.textContent,
        tipHidden: tip.classList.contains('hidden'),
        btn: { w: document.getElementById('backfillBtn').getBoundingClientRect().width, h: document.getElementById('backfillBtn').getBoundingClientRect().height },
      };
    })()`);
    check('标题为时段问候（非组合文案）', /^(清晨|上午|下午|傍晚|深夜)/.test(home.title), home.title);
    check('标题一行（≤35px 单行行高）', home.titleHeight <= 35, home.titleHeight.toFixed(1) + 'px');
    check('日历按钮 42x42 正圆', home.btn.w === 42 && home.btn.h === 42, home.btn.w + 'x' + home.btn.h);

    /* mock 当日 tip 缓存 → 小字显示 */
    const tip = await evaljs(ws, `(async () => {
      const today = fmtDateInput(new Date());
      localStorage.setItem('guanji_daily_tip', JSON.stringify({ date: today, tip: '今天傍晚时段记录较多，试着早点休息。' }));
      renderGreeting();
      await new Promise((r) => setTimeout(r, 200));
      const el = document.getElementById('greetingTip');
      const r = { text: el.textContent, hidden: el.classList.contains('hidden'), title: document.getElementById('greetingTitle').textContent };
      localStorage.removeItem('guanji_daily_tip');
      return r;
    })()`, true);
    check('AI 提醒移入小字区显示', !tip.hidden && tip.text === '今天傍晚时段记录较多，试着早点休息。', tip.text);
    check('标题保持一行不被替换', tip.title === home.title, tip.title);

    /* 隐私说明：生物识别锁文案已删 */
    await evaljs(ws, `document.querySelectorAll('.tab')[2].click()`);
    await sleep(400);
    const priv = await evaljs(ws, `(() => ({
      text: document.querySelector('.privacy-list').textContent,
      count: document.querySelectorAll('.privacy-list li').length,
    }))()`);
    check('隐私说明不含生物识别锁', !priv.text.includes('生物识别锁'), priv.text.trim().slice(0, 30) + '…');
    check('隐私说明保留 2 条', priv.count === 2, priv.count + ' 条');

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v1.7 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
