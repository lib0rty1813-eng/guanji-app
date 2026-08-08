// 读日志尾部：sheet 高度序列（找 goToDetails 高度过渡的形态与帧间隔）
(async () => {
  const log = (window.__animLog || []);
  const tail = log.slice(-90);
  return {
    total: log.length,
    tail: tail.map((s) => s.t + ':' + s.y + '/' + s.h + (s.inlineH ? '/' + s.inlineH : '')),
    gaps: tail.slice(1).map((s, i) => s.t - tail[i].t).filter((g) => g > 60)
  };
})();
