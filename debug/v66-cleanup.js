// 清理：关闭面板（等退场动画完成）
(async () => {
  closeSheet();
  await new Promise((r) => setTimeout(r, 600));
  return { sheetHidden: document.getElementById('recordSheet').classList.contains('hidden') };
})();
