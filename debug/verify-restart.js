/* 验证 App 重启后的数据持久化 */
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/E59762A8B77440211186891513BF3603');
let id = 0;

function evaljs(expr) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    const onMsg = (data) => {
      const m = JSON.parse(data);
      if (m.id === msgId) { ws.off('message', onMsg); resolve(m.result ? m.result.result.value : undefined); }
    };
    ws.on('message', onMsg);
    ws.send(JSON.stringify({ id: msgId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
  });
}

ws.on('open', async () => {
  const out = [];
  out.push('重启后记录数: ' + await evaljs(`JSON.parse(localStorage.getItem('guanji_records_v1')||'[]').length`));
  out.push('重启后本周次数: ' + await evaljs(`document.getElementById('weekCount').textContent`));
  out.push('重启后今日次数: ' + await evaljs(`document.getElementById('todayNumVal').textContent`));
  out.push('重启后最近记录条数: ' + await evaljs(`document.querySelectorAll('.recent-item').length`));
  out.push('重启后 apiKey: ' + await evaljs(`localStorage.getItem('guanji_api_key_v1') || '(空)'`));
  console.log(out.join('\n'));
  ws.close();
});
ws.on('error', (e) => { console.error('WS 错误:', e.message); process.exit(1); });
