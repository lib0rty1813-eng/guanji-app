// 清理：关闭对话框 + 放弃汇总（不保存），回到首页
(async () => {
  const backdrop = document.getElementById('addBackdrop');
  if (backdrop && !backdrop.classList.contains('hidden')) {
    closeAddDialog();
    await new Promise((r) => setTimeout(r, 350));
  }
  const summary = document.getElementById('timerSummaryView');
  if (summary && getComputedStyle(summary).display !== 'none') {
    abandonSummary();
  }
  return { kbBase, innerHeight, dialogClosed: backdrop.classList.contains('hidden') };
})();
