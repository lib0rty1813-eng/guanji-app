// 查面板 transform 残留与动画状态
(async () => {
  const sheet = document.getElementById('recordSheet');
  const b = sheet.getBoundingClientRect();
  return {
    inlineTransform: sheet.style.transform || '(none)',
    computedTransform: getComputedStyle(sheet).transform,
    inlineAnimation: sheet.style.animation || '(none)',
    sheetOpenAnim: typeof sheetOpenAnim !== 'undefined' ? (sheetOpenAnim === null ? 'null' : 'RUNNING') : 'undef',
    sheetTop: Math.round(b.y),
    sheetBottom: Math.round(b.bottom),
    phoneBottom: Math.round(document.querySelector('.phone').getBoundingClientRect().bottom)
  };
})();
