/* 观己 v2.5 真机验证：#42 键盘隐藏 tabbar（真实键盘）+ #43 per-provider 密钥 */
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
    const ver = await evaljs(ws, `document.querySelector('.about-ver').textContent`);
    check('版本 v2.5', ver.includes('v2.5'), ver);

    /* #42：真实键盘弹出 → tabbar 隐藏 */
    await evaljs(ws, `document.querySelectorAll('.tab')[2].click(); true`);
    await sleep(500);
    const kb1 = await evaljs(ws, `(() => {
      const input = document.getElementById('apiKeyInput');
      input.focus();
      return true;
    })()`);
    await sleep(1500);   // 等键盘完全弹出 + visualViewport resize
    const kb2 = await evaljs(ws, `(() => {
      const tabbar = document.getElementById('tabbar');
      const vv = window.visualViewport;
      return {
        keyboardUp: tabbar.classList.contains('keyboard-up'),
        vvHeight: vv ? Math.round(vv.height) : null,
        innerHeight: window.innerHeight,
        diff: vv ? window.innerHeight - vv.height : 0,
      };
    })()`);
    check('#42 键盘弹出时 tabbar 隐藏', kb2.keyboardUp, `视口差 ${kb2.diff}px`);
    check('#42 键盘占用>150px', kb2.diff > 150, `${kb2.diff}px`);

    // 收键盘
    await evaljs(ws, `document.getElementById('apiKeyInput').blur(); true`);
    await sleep(1200);
    const kb3 = await evaljs(ws, `(() => ({
      keyboardUp: document.getElementById('tabbar').classList.contains('keyboard-up'),
      diff: window.visualViewport ? window.innerHeight - window.visualViewport.height : 0,
    }))()`);
    check('#42 键盘收起后恢复', !kb3.keyboardUp, `视口差 ${kb3.diff}px`);

    /* #43：per-provider 密钥切换回显（真机 localStorage） */
    const p1 = await evaljs(ws, `(() => {
      localStorage.setItem('guanji_ai_config_v1', JSON.stringify({ provider: 'custom', baseUrl: 'https://my-proxy.example.com/v1', model: 'my-model', apiKey: 'sk-custom-1' }));
      localStorage.removeItem('guanji_ai_config_v2');
      return true;
    })()`);
    await evaljs(ws, `location.reload(); true`);
    await sleep(1500);
    const p2 = await evaljs(ws, `(() => {
      const store = JSON.parse(localStorage.getItem('guanji_ai_config_v2') || 'null');
      return { migrated: !!(store && store.providers), active: store ? store.active : null, customKey: store ? store.providers.custom.apiKey : null };
    })()`);
    check('#43 v1→v2 迁移', p2.migrated && p2.active === 'custom' && p2.customKey === 'sk-custom-1', `active=${p2.active}`);

    const p3 = await evaljs(ws, `(() => {
      document.querySelectorAll('.tab')[2].click();
      return new Promise(res => setTimeout(() => {
        const read = () => ({
          baseUrl: document.getElementById('aiBaseUrlInput').value,
          key: document.getElementById('apiKeyInput').value,
          activeChip: document.querySelector('#providerChips .chip.active').dataset.provider,
        });
        const customUI = read();
        document.querySelector('#providerChips .chip[data-provider="deepseek"]').click();
        const deepseekUI = read();
        document.getElementById('apiKeyInput').value = 'sk-ds-2';
        document.getElementById('apiKeySave').click();
        document.querySelector('#providerChips .chip[data-provider="custom"]').click();
        const customBack = read();
        document.querySelector('#providerChips .chip[data-provider="deepseek"]').click();
        const dsBack = read();
        res({ customUI, deepseekUI, customBack, dsBack });
      }, 400));
    })()`, true);
    check('#43 切换回显 custom 密钥', p3.customUI.activeChip === 'custom' && p3.customUI.key === 'sk-custom-1', p3.customUI.key);
    check('#43 切回 DeepSeek 回显预设', p3.deepseekUI.activeChip === 'deepseek' && p3.deepseekUI.baseUrl === 'https://api.deepseek.com', p3.deepseekUI.baseUrl);
    check('#43 各自持久化互不干扰', p3.customBack.key === 'sk-custom-1' && p3.dsBack.key === 'sk-ds-2', `custom=${p3.customBack.key} ds=${p3.dsBack.key}`);

    ws.close();
    const ok = results.every(Boolean);
    console.log(ok ? '=== v2.5 真机验证全部通过 ===' : `=== 存在 ${results.filter((r) => !r).length} 项失败 ===`);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('FAILED:', e.message);
    ws.close();
    process.exit(1);
  }
})();
