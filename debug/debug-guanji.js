/* 观己 · WebView DevTools 调试脚本：驱动记录流程并验证 */
const WebSocket = require('ws');

const WS_URL = 'ws://localhost:9222/devtools/page/587B2DC822908DAC8BF0BA2D98A9A420';
const ws = new WebSocket(WS_URL);
let id = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function evaljs(expr) {
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
    ws.send(JSON.stringify({ id: msgId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
  });
}

ws.on('open', async () => {
  try {
    console.log('[1] 初始记录数:', await evaljs(`JSON.parse(localStorage.getItem('guanji_records_v1')||'[]').length`));
    console.log('[1] 今日次数:', await evaljs(`document.getElementById('todayNumVal').textContent`));

    // 打开记录面板
    await evaljs(`document.getElementById('recordBtn').click()`);
    await sleep(500);
    console.log('[2] 记录面板已弹出:', await evaljs(`!document.getElementById('recordSheet').classList.contains('hidden')`));

    // 下一步 → 步骤2
    await evaljs(`document.getElementById('nextBtn').click()`);
    await sleep(300);
    console.log('[3] 步骤2（补充信息）可见:', await evaljs(`!document.getElementById('stepDetails').classList.contains('hidden')`));

    // 选情绪 + 诱因 + 打开看片开关
    await evaljs(`document.querySelectorAll('#moodChips .chip')[0].click()`);
    await evaljs(`document.querySelectorAll('#triggerChips .chip')[2].click()`);
    await evaljs(`document.getElementById('mediaSwitch').classList.add('on')`);
    await sleep(200);

    // 保存
    await evaljs(`document.getElementById('saveBtn').click()`);
    await sleep(800);

    console.log('[4] 保存后今日次数:', await evaljs(`document.getElementById('todayNumVal').textContent`));
    console.log('[4] 今日状态:', await evaljs(`document.getElementById('todayStatus').textContent`));
    console.log('[4] 保存后记录数:', await evaljs(`JSON.parse(localStorage.getItem('guanji_records_v1')||'[]').length`));
    console.log('[4] 最近记录条数:', await evaljs(`document.querySelectorAll('.recent-item').length`));
    console.log('[4] 最近记录内容:', await evaljs(`document.querySelector('.recent-tags') ? document.querySelector('.recent-tags').textContent : '无'`));

    // 删除刚记录的一条
    await evaljs(`document.querySelector('.recent-del').click()`);
    await sleep(500);
    console.log('[5] 删除后记录数:', await evaljs(`JSON.parse(localStorage.getItem('guanji_records_v1')||'[]').length`));
    console.log('[5] 删除后今日次数:', await evaljs(`document.getElementById('todayNumVal').textContent`));

    // 恢复演示数据（让 App 有数据可看）
    await evaljs(`document.querySelectorAll('.tab')[2].click()`);
    await sleep(400);
    await evaljs(`document.getElementById('restoreBtn').click()`);
    await sleep(600);
    console.log('[6] 恢复演示数据后记录数:', await evaljs(`JSON.parse(localStorage.getItem('guanji_records_v1')||'[]').length`));
    await evaljs(`document.querySelectorAll('.tab')[0].click()`);
    await sleep(400);
    console.log('[6] 本周次数:', await evaljs(`document.getElementById('weekCount').textContent`));
    console.log('[6] 最近记录条数:', await evaljs(`document.querySelectorAll('.recent-item').length`));

    ws.close();
    console.log('=== 全部通过 ===');
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
});
ws.on('error', (e) => { console.error('WS 错误:', e.message); process.exit(1); });
