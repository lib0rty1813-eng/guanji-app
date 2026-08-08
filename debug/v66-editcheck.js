// 编辑路径回归：应无 transitionSheetHeight 触发，sheet 直接全高打开
(async () => {
  closeSheet();
  await new Promise((r) => setTimeout(r, 400));
  const before = (window.__animLog || []).length;
  const rec = records[records.length - 1];
  openEditRecord(rec.id);
  await new Promise((r) => setTimeout(r, 600));
  const after = (window.__animLog || []).slice(before);
  const inlineSeen = after.filter((s) => s.inlineH).length;
  const sheet = document.getElementById('recordSheet');
  const b = sheet.getBoundingClientRect();
  return {
    recId: rec.id,
    inlineSeen, // 0 = 未触发高度过渡 ✓
    sheetRect: { y: Math.round(b.y), h: Math.round(b.height), bottom: Math.round(b.bottom) },
    stepDetailsVisible: !document.getElementById('stepDetails').classList.contains('hidden'),
    editMode: sheetMode
  };
})();
