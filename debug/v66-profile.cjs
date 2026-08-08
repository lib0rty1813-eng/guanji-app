// 用 CDP Profiler 抓真实点按打开 sheet 的 CPU 分布（找主线程阻塞点）
const http = require('http');
const WebSocket = require(require('path').join('C:/Users/43124/ZCodeProject/node_modules', 'ws'));

function getTargets() {
  return new Promise((res, rej) => {
    http.get('http://127.0.0.1:9227/json', (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

(async () => {
  const targets = await getTargets();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params) => new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  ws.on('message', (d) => {
    const m = JSON.parse(d);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  await new Promise((r) => ws.on('open', r));

  // 先关掉 sheet（如有）
  await send('Runtime.evaluate', { expression: 'closeSheet()' });
  await new Promise((r) => setTimeout(r, 500));

  await send('Profiler.enable', {});
  await send('Profiler.setSamplingInterval', { interval: 100 });
  await send('Profiler.start', {});

  // 真实点按（CDP 输入管线 = 与 adb tap 同一条系统输入路径）
  const btn = await send('Runtime.evaluate', {
    expression: '(() => { const b = document.getElementById("recordBtn").getBoundingClientRect(); return { x: Math.round(b.x + b.width/2), y: Math.round(b.y + b.height/2) }; })()',
    returnByValue: true
  });
  const { x, y } = btn.result.result.value;
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await new Promise((r) => setTimeout(r, 900));

  const profile = await send('Profiler.stop', {});
  await send('Profiler.disable', {});

  // 汇总：按 self time 排序的 JS 函数
  const nodes = profile.result.profile.nodes;
  const samples = profile.result.profile.samples || [];
  const self = new Map();
  const name = new Map();
  for (const n of nodes) { name.set(n.id, n.callFrame.functionName || '(anonymous)'); }
  const hit = new Map();
  for (const s of samples) { hit.set(s, (hit.get(s) || 0) + 1); }
  for (const [nid, cnt] of hit) { self.set(nid, (self.get(nid) || 0) + cnt); }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
    .map(([nid, cnt]) => ({ fn: name.get(nid), hits: cnt, ms: Math.round(cnt * 100) }));
  const total = samples.length;

  ws.close();
  console.log(JSON.stringify({ totalSamples: total, durationMs: Math.round(total * 100), top }, null, 1));
  process.exit(0);
})();
