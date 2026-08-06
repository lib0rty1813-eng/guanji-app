/* 观己 v1.6 真机验证：WebView DevTools 驱动（#12/#13/#15/#16/#17） */
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

async function main() {
  const pages = await fetch(`http://localhost:${PORT}/json`).then((r) => r.json());
  const page = pages.find((p) => p.type === 'page');
  if (!page) throw new Error('未找到 WebView page');
  console.log('WebView URL:', page.url);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.on('error', (e) => { console.error('WS 错误:', e.message); process.exit(1); });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  const results = [];
  const check = (name, pass, extra = '') => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
  };

  try {
    /* #15 首页：趋势卡 + 月度汇总 */
    const home = await evaljs(ws, `(() => {
      const segs = [...document.querySelectorAll('#chartSeg .seg')].map(s => s.textContent);
      const month = document.querySelector('#monthSummary').textContent.replace(/\\s+/g, ' ').trim();
      const segActive = document.querySelector('#chartSeg .seg.active').textContent;
      return { segs, segActive, month, hasChart: !!document.querySelector('#areaChart svg') };
    })()`);
    check('#15 趋势卡 seg 存在', home.segs.join(',') === '14 天,30 天', home.segs.join(','));
    check('#15 默认 14 天', home.segActive === '14 天', home.segActive);
    check('#15 月度汇总渲染', /本月 \d+ 次/.test(home.month) && /较上月/.test(home.month), home.month);

    // 切 30 天
    await evaljs(ws, `document.querySelector('#chartSeg .seg[data-days="30"]').click()`);
    await sleep(300);
    const d30 = await evaljs(ws, `(() => {
      const svg = document.querySelector('#areaChart svg');
      const labels = [...svg.querySelectorAll('text')].map(t => t.textContent).filter(t => /^\\d+\\/\\d+$|^今$/.test(t));
      return { labels, active: document.querySelector('#chartSeg .seg.active').textContent };
    })()`);
    check('#15 30 天切换生效', d30.active === '30 天' && d30.labels.length >= 5, d30.labels.length + ' 个日期标签');
    await evaljs(ws, `document.querySelector('#chartSeg .seg[data-days="14"]').click()`);
    await sleep(300);

    /* #17 里程碑 */
    const m7 = await evaljs(ws, `(() => {
      let list = [];
      for (let off = 0; off >= -6; off--) list.push({ id: 'm7_' + (-off), offset: off, time: '21:00', duration: 10, moods: ['平静'], triggers: ['睡前习惯'], media: false, note: '' });
      records = list;
      renderHome();
      return { streak: countStreak(), sub: document.getElementById('todaySub').textContent };
    })()`);
    check('#17 7 天里程碑', m7.streak === 7 && m7.sub.includes('连续观察 7 天'), m7.sub);

    const m30 = await evaljs(ws, `(() => {
      let list = [];
      for (let off = 0; off >= -29; off--) list.push({ id: 'm30_' + (-off), offset: off, time: '21:00', duration: 10, moods: ['平静'], triggers: ['睡前习惯'], media: false, note: '' });
      records = list;
      renderHome();
      return { streak: countStreak(), sub: document.getElementById('todaySub').textContent };
    })()`);
    check('#17 30 天里程碑', m30.streak === 30 && m30.sub.includes('30 天'), m30.sub);

    const mOff = await evaljs(ws, `(() => {
      localStorage.setItem('guanji_positive', '0');
      renderHome();
      const sub = document.getElementById('todaySub').textContent;
      localStorage.removeItem('guanji_positive');
      return sub;
    })()`);
    check('#17 开关关闭恢复原文案', mOff === '记录本身就是觉察', mOff);

    /* #12 问候语 line-clamp（CSS 兜底） */
    const clamp = await evaljs(ws, `getComputedStyle(document.getElementById('greetingTitle')).webkitLineClamp`);
    check('#12 line-clamp 生效', String(clamp) === '2', 'line-clamp: ' + clamp);

    /* #13 设置页：提醒开关 + 正向反馈开关 */
    await evaljs(ws, `document.querySelectorAll('.tab')[2].click()`);
    await sleep(400);
    // 复位提醒为默认关闭（消除上一轮测试残留的开启状态）
    await evaljs(ws, `(() => {
      localStorage.setItem('guanji_reminder', JSON.stringify({ enabled: false, time: '21:00' }));
      applyReminderSchedule(loadReminder());
      initReminderUI();
      return true;
    })()`);
    await sleep(600);
    const me = await evaljs(ws, `(() => ({
      hasReminder: !!document.getElementById('reminderSwitch'),
      hasPositive: !!document.getElementById('positiveSwitch'),
      reminderOff: !document.getElementById('reminderSwitch').classList.contains('on'),
      positiveOn: document.getElementById('positiveSwitch').classList.contains('on'),
      ver: document.querySelector('.about-ver').textContent,
    }))()`);
    check('#13 提醒开关存在且默认关', me.hasReminder && me.reminderOff);
    check('#17 正向反馈开关存在且默认开', me.hasPositive && me.positiveOn);

    /* 开启提醒：mock 权限（避免真机弹权限框），验证调度路径 + 持久化 */
    const rem = await evaljs(ws, `(async () => {
      const LN = window.Capacitor.Plugins.LocalNotifications;
      const orig = LN.requestPermissions;
      LN.requestPermissions = () => Promise.resolve({ display: 'granted' });
      document.getElementById('reminderSwitch').click();
      await new Promise(r => setTimeout(r, 800));
      const s = JSON.parse(localStorage.getItem('guanji_reminder') || 'null');
      const rowVisible = !document.getElementById('reminderTimeRow').classList.contains('hidden');
      document.getElementById('reminderSwitch').click();
      await new Promise(r => setTimeout(r, 800));
      const sAfter = JSON.parse(localStorage.getItem('guanji_reminder') || 'null');
      LN.requestPermissions = orig;
      return { s, rowVisible, sAfter };
    })()`, true);
    check('#13 开启后保存+时间行显示', rem.s && rem.s.enabled === true && rem.rowVisible, JSON.stringify(rem.s));
    check('#13 关闭后取消调度', rem.sAfter && rem.sAfter.enabled === false, JSON.stringify(rem.sAfter));

    /* #16 payload 情绪字段 */
    await evaljs(ws, `document.getElementById('restoreBtn').click()`);
    await sleep(400);
    const payload = await evaljs(ws, `(() => {
      const p = buildAggregatePayload();
      return { hasMood: !!p['本周情绪分布'], hasCombo: !!p['情绪×诱因组合(前3)'] };
    })()`);
    check('#16 payload 情绪字段', payload.hasMood && payload.hasCombo);

    /* 还原首页 */
    await evaljs(ws, `document.querySelectorAll('.tab')[0].click()`);
    await sleep(300);
    const final = await evaljs(ws, `document.getElementById('weekCount').textContent`);
    check('演示数据还原', final === '7', '本周 ' + final);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
}

main();
