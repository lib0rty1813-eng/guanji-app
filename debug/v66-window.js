// 读取指定时间窗内的动画帧（t0, t1 参数）
(async () => {
  const t0 = parseInt(__ARG.split(',')[0], 10);
  const t1 = parseInt(__ARG.split(',')[1], 10);
  const log = (window.__animLog || []).filter((s) => s.t >= t0 && s.t <= t1);
  // 找停顿：连续 ≥3 帧 y 差 ≤1
  const plateaus = [];
  let run = null;
  for (let i = 1; i < log.length; i++) {
    if (log[i].t - log[i - 1].t <= 60 && Math.abs(log[i].y - log[i - 1].y) <= 1) {
      if (!run) run = { from: i - 1 };
    } else if (run) {
      if (log[i - 1].t - log[run.from].t >= 80) plateaus.push({ at: log[run.from].t, y: log[run.from].y, dur: log[i - 1].t - log[run.from].t });
      run = null;
    }
  }
  return {
    frames: log.length,
    first: log[0], last: log[log.length - 1],
    ys: log.map((s) => s.t + ':' + s.y).join(','),
    plateaus
  };
})();
