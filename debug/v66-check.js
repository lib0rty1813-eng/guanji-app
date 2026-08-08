// 核对：当前 sheet 状态 + 动画日志的覆盖范围 + 动画对象信息
(async () => {
  const sheet = document.getElementById('recordSheet');
  const log = window.__animLog || [];
  const anims = document.getAnimations().filter((a) => a.effect && a.effect.target === sheet);
  return {
    sheetHidden: sheet.classList.contains('hidden'),
    sheetTop: Math.round(sheet.getBoundingClientRect().y),
    logLen: log.length,
    logFirstT: log.length ? log[0].t : null,
    logLastT: log.length ? log[log.length - 1].t : null,
    sheetAnims: anims.map((a) => ({
      name: a.animationName || a.effect.getTiming().delay,
      playState: a.playState,
      currentTime: Math.round(a.currentTime),
      startTime: a.startTime !== null ? Math.round(a.startTime) : null
    })),
    now: Math.round(performance.now())
  };
})();
