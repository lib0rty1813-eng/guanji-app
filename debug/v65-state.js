// 查询 timerScreen / 计时 / 汇总视图状态
(async () => {
  const vis = (id) => {
    const el = document.getElementById(id);
    return el ? getComputedStyle(el).display !== 'none' : null;
  };
  return {
    timerRunning: timerState.running,
    timerScreen: vis('timerScreen'),
    runView: vis('timerRunView'),
    summaryView: vis('timerSummaryView'),
    addBackdropOpen: !document.getElementById('addBackdrop').classList.contains('hidden'),
    activeEl: document.activeElement ? document.activeElement.id : null
  };
})();
