// 预处理：关闭 sheet + 清空动画日志 + 确认钩子已装
(async () => {
  closeSheet();
  await new Promise((r) => setTimeout(r, 400));
  window.__animLog = [];
  return {
    sheetHidden: document.getElementById('recordSheet').classList.contains('hidden'),
    hookInstalled: !!window.__animHookInstalled,
    sheetTop: Math.round(document.getElementById('recordSheet').getBoundingClientRect().y)
  };
})();
