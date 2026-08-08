// 包装 transitionSheetHeight 记录 from/to + 时间线；随后走 goToDetails
(async () => {
  window.__tsh = [];
  const orig = transitionSheetHeight;
  transitionSheetHeight = function (targetId) {
    const sheet = document.getElementById('recordSheet');
    const from = sheet.getBoundingClientRect().height;
    const to = document.getElementById(targetId).getBoundingClientRect().height;
    window.__tsh.push({ t: Math.round(performance.now()), from: Math.round(from * 10) / 10, to: Math.round(to * 10) / 10, sheetMaxH: parseFloat(getComputedStyle(sheet).maxHeight), sheetOverflow: getComputedStyle(sheet).overflowY });
    return orig.apply(this, arguments);
  };
  // 复现：打开 backfill 后下一步
  closeSheet();
  await new Promise((r) => setTimeout(r, 400));
  openSheet('backfill', dateWithOffset(0));
  await new Promise((r) => setTimeout(r, 500));
  goToDetails();
  await new Promise((r) => setTimeout(r, 500));
  return { tsh: window.__tsh };
})();
