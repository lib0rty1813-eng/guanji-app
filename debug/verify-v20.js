/* 观己 v2.0 真机验证：#19/#20/#21/#22/#23/#24/#25/#26/#27 */
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
    await evaljs(ws, `document.querySelectorAll('.tab')[0].click(); renderHome(); true`);
    await sleep(600);

    /* #25 outline */
    const o = await evaljs(ws, `(() => {
      const probe = document.createElement('button'); probe.textContent = 'p';
      document.body.appendChild(probe); probe.focus();
      const po = getComputedStyle(probe).outline;
      probe.remove();
      return po;
    })()`);
    check('#25 UA 灰色 outline 已关闭', o.includes('none'), o);

    /* #26 NaN 兜底 */
    const n26 = await evaljs(ws, `(() => {
      openSheet('backfill', new Date(2026, 7, 6, 21, 30));
      const d = document.getElementById('pickDate');
      d.value = ''; d.dispatchEvent(new Event('change'));
      const t = document.getElementById('pickTime');
      t.value = ''; t.dispatchEvent(new Event('change'));
      const txt = document.getElementById('timeDisplay').textContent;
      const restored = d.value !== '' && t.value !== '';
      closeSheet();
      return { txt, restored };
    })()`);
    check('#26 无 NaN + 清空自动恢复', !n26.txt.includes('NaN') && n26.restored, n26.txt);

    /* #20 日历点空白退出 */
    const c20 = await evaljs(ws, `(() => {
      document.getElementById('backfillBtn').click();
      const open = !document.getElementById('calendarSheet').classList.contains('hidden');
      document.getElementById('sheetBackdrop').click();
      return open && document.getElementById('calendarSheet').classList.contains('hidden');
    })()`);
    check('#20 日历点空白退出', c20);

    /* #21 图表滑块（left 变化判断，等宽 seg 下 width 不变） */
    const s21 = await evaljs(ws, `(() => {
      const slide = document.getElementById('chartSegSlide');
      const left0 = slide.style.left;
      document.querySelector('#chartSeg .seg[data-days="30"]').click();
      const left1 = slide.style.left;
      document.querySelector('#chartSeg .seg[data-days="14"]').click();
      return left0 !== left1 && parseFloat(left1) > 10;
    })()`);
    check('#21 图表滑块动效', s21);

    /* #22 记录面板滑块 */
    const s22 = await evaljs(ws, `(() => {
      openSheet('now');
      const slide = document.getElementById('timeSegSlide');
      const initOk = parseFloat(slide.style.width) > 0;
      document.getElementById('customSeg').click();
      const moved = parseFloat(slide.style.left) > 10;
      closeSheet();
      return initOk && moved;
    })()`);
    check('#22 记录面板滑块动效', s22);

    /* #23 两步高度一致 */
    const h23 = await evaljs(ws, `(() => {
      openSheet('now');
      const h1 = document.getElementById('recordSheet').getBoundingClientRect().height;
      document.getElementById('nextBtn').click();
      const h2 = document.getElementById('recordSheet').getBoundingClientRect().height;
      closeSheet();
      return Math.abs(h2 - h1);
    })()`);
    check('#23 两步高度无跳动', h23 < 5, h23.toFixed(1) + 'px');

    /* #24 自定义添加 */
    const c24 = await evaljs(ws, `(() => {
      localStorage.removeItem('guanji_custom_triggers');
      renderTriggerChips();
      document.querySelector('#triggerChips .chip-add').click();
      document.getElementById('addInput').value = '健身日';
      document.getElementById('addConfirm').click();
      const has = [...document.querySelectorAll('#triggerChips .chip')].some(c => c.textContent === '健身日');
      const persisted = JSON.parse(localStorage.getItem('guanji_custom_triggers') || '[]').includes('健身日');
      localStorage.removeItem('guanji_custom_triggers');
      renderTriggerChips();
      return has && persisted;
    })()`);
    check('#24 自定义诱因添加+持久化', c24);

    /* #19 renderMarkdown */
    const m19 = await evaljs(ws, `renderMarkdown('第一句，**关键词**。\\n\\n1. 建议一\\n2. 建议二\\n\\n收尾。')`);
    check('#19 markdown 渲染', m19.includes('<b>关键词</b>') && m19.includes('<ol class="ask-list">') && m19.includes('<p>收尾。</p>'));

    /* #27 AI 配置 UI + 测试按钮 */
    await evaljs(ws, `document.querySelectorAll('.tab')[2].click()`);
    await sleep(400);
    const a27 = await evaljs(ws, `(() => ({
      chips: [...document.querySelectorAll('#providerChips .chip')].map(c => c.textContent).join(','),
      base: document.getElementById('aiBaseUrlInput').value,
      model: document.getElementById('aiModelInput').value,
      hasTest: !!document.getElementById('aiTestBtn'),
      ver: document.querySelector('.about-ver').textContent,
    }))()`);
    check('#27 AI 提供商 UI', a27.chips.includes('DeepSeek') && a27.chips.includes('OpenAI') && a27.hasTest, a27.base + ' / ' + a27.model);
    check('版本 v2.0', a27.ver.includes('v2.0'), a27.ver);

    await evaljs(ws, `document.querySelectorAll('.tab')[0].click()`);
    await sleep(300);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v2.0 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
