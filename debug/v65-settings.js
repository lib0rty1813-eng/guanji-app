// 设置页输入框在键盘弹出后的可见性检查
(async () => {
  const g = (el) => {
    const b = el.getBoundingClientRect();
    return { y: Math.round(b.y), h: Math.round(b.height), bottom: Math.round(b.bottom) };
  };
  const screens = Array.from(document.querySelectorAll('.screen'));
  const activeScreen = screens.find((s) => getComputedStyle(s).display !== 'none');
  const input = document.querySelector('.screen input[type="password"], .screen input:not([type="checkbox"])');
  // 找到当前可见 screen 内的 apiKeyInput（按 id 或属性）
  const apiInput = document.getElementById('apiKeyInput') || document.querySelector('#settingsScreen input');
  return {
    innerHeight,
    activeScreenId: activeScreen ? activeScreen.id : null,
    screenScrollTop: activeScreen ? Math.round(activeScreen.scrollTop) : null,
    screenScrollHeight: activeScreen ? Math.round(activeScreen.scrollHeight) : null,
    inputRect: apiInput ? g(apiInput) : null,
    inputVisible: apiInput ? (g(apiInput).bottom <= 528 && g(apiInput).y >= 0) : null,
    activeEl: document.activeElement ? document.activeElement.id || document.activeElement.tagName : null
  };
})();
