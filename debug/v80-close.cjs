// 关闭日历并切回首页（用于截图 tab 胶囊选中态）
(async () => {
  if (!document.getElementById('calendarSheet').classList.contains('hidden')) closeCalendar();
  await new Promise((r) => setTimeout(r, 500));
  if (typeof switchTab === 'function') switchTab(0);
  await new Promise((r) => setTimeout(r, 700));
  return JSON.stringify({ calClosed: true });
})();
