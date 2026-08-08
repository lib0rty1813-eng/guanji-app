// 开始计时（供真实点按走结束流程）
(async () => {
  startTimedRecord();
  await new Promise((r) => setTimeout(r, 500));
  return { timerRunning: timerState.running };
})();
