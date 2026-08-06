/* 定位：时段分布环图「无数据时段占位」问题——读取 SVG 实际渲染结构 */
const WebSocket = require('ws');
const PORT = process.env.PORT || '9221';
let id = 0;

function evaljs(ws, expr) {
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
    ws.send(JSON.stringify({ id: msgId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
  });
}

(async () => {
  const pages = await fetch(`http://localhost:${PORT}/json`).then((r) => r.json());
  const p = pages.find((x) => x.type === 'page');
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));

  try {
    /* 1. 当前记录数据分布 */
    const dist = await evaljs(ws, `(() => {
      const buckets = BUCKETS.map((b) => ({ key: b.key, n: 0 }));
      records.forEach((r) => {
        const h = hourOf(r);
        BUCKETS.forEach((b, i) => { if (b.test(h)) buckets[i].n++; });
      });
      return { total: records.length, buckets };
    })()`);
    console.log('记录总数:', dist.total);
    console.log('时段分布:', JSON.stringify(dist.buckets));

    /* 2. 环图 SVG 实际结构：每段 circle 的 stroke / dasharray / rotate */
    const svg = await evaljs(ws, `(() => {
      const segs = [...document.querySelectorAll('#ringChart .ring-seg')].map((s, i) => ({
        i,
        stroke: s.getAttribute('stroke'),
        dasharray: s.getAttribute('stroke-dasharray'),      // 初始 attribute
        styleDasharray: s.style.strokeDasharray,            // 动画后的 inline style
        transform: s.getAttribute('transform'),
        pathLength: s.getAttribute('pathLength'),
      }));
      const empty = !!document.querySelector('#ringChart .ring-seg') ? 'n/a' : 'n/a';
      return { segs, count: document.querySelectorAll('#ringChart circle').length };
    })()`);
    console.log('\nSVG circle 数量:', svg.count);
    svg.segs.forEach((s) => {
      console.log(`seg${s.i}: stroke=${s.stroke} | attr dasharray=${s.dasharray} | style dasharray=${s.styleDasharray} | ${s.transform}`);
    });

    /* 3. 计算每段应画弧长（复现 renderRingDist 逻辑） */
    const calc = await evaljs(ws, `(() => {
      const buckets = BUCKETS.map((b) => ({ key: b.key, n: 0 }));
      records.forEach((r) => {
        const h = hourOf(r);
        BUCKETS.forEach((b, i) => { if (b.test(h)) buckets[i].n++; });
      });
      const total = records.length;
      const C = Math.PI * 45;
      const GAP = 4;
      let acc = 0;
      return buckets.map((b, i) => {
        const pct = total ? b.n / total : 0;
        const segLen = pct > 0 ? Math.max(pct * C - GAP, 0.5) : 0;
        const rotate = (-90 + (acc / C) * 360).toFixed(1);
        acc += pct * C;
        return { key: b.key, n: b.n, pct: (pct * 100).toFixed(1) + '%', segLen: segLen.toFixed(1), rotate };
      });
    })()`);
    console.log('\n理论计算（复现代码逻辑）:');
    calc.forEach((c) => console.log(`${c.key}: ${c.n} 次 ${c.pct} → segLen=${c.segLen} rotate=${c.rotate}`));

    ws.close();
    process.exit(0);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
