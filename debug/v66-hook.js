// 安装 rAF 采样钩子：持续记录 sheet/seg-slide 几何与动画状态到 window.__animLog
(async () => {
  if (window.__animHookInstalled) return { installed: true, already: true };
  window.__animLog = [];
  const sheet = document.getElementById('recordSheet');
  const slide = document.getElementById('timeSegSlide');
  const backdrop = document.getElementById('sheetBackdrop');
  function tick() {
    if (!sheet.classList.contains('hidden')) {
      const b = sheet.getBoundingClientRect();
      const s = slide ? slide.getBoundingClientRect() : null;
      window.__animLog.push({
        t: Math.round(performance.now()),
        y: Math.round(b.y),
        h: Math.round(b.height),
        anim: getComputedStyle(sheet).animationName,
        slideL: s ? Math.round(s.left) : null,
        slideW: s ? Math.round(s.width) : null,
        timerBoxHidden: document.getElementById('timerBox').classList.contains('hidden'),
        stepDetailsVisible: !document.getElementById('stepDetails').classList.contains('hidden'),
        inlineH: sheet.style.height || ''
      });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.__animHookInstalled = true;
  return { installed: true };
})();
