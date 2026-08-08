// 读取最近一次点按的动画日志（最后 N 条）
(async () => {
  const N = 140;
  const log = (window.__animLog || []).slice(-N);
  // 找出：y 位置回退/停顿段（y 差 < 2px 连续 ≥3 帧）、高度突变、动画重启
  const plateaus = [];
  let runStart = null, prev = null;
  for (const s of log) {
    if (prev && s.t - prev.t <= 40) {
      const dy = Math.abs(s.y - prev.y);
      if (dy <= 1) {
        if (runStart === null) runStart = prev;
      } else if (runStart !== null) {
        plateaus.push({ from: runStart.t, to: prev.t, dur: prev.t - runStart.t, y: prev.y });
        runStart = null;
      }
    }
    prev = s;
  }
  return {
    log,
    plateaus: plateaus.filter((p) => p.dur >= 80),
    inlineHValues: [...new Set(log.map((s) => s.inlineH))],
    animNames: [...new Set(log.map((s) => s.anim))]
  };
})();
