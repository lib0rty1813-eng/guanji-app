// 扫描日志：inlineH 非空段（= height 过渡期）+ 高度变化点
(async () => {
  const log = window.__animLog || [];
  const inlineSegs = [];
  let seg = null;
  for (const s of log) {
    if (s.inlineH) {
      if (!seg) seg = { from: s.t, h: s.inlineH, last: s.t };
      seg.last = s.t;
    } else if (seg) { inlineSegs.push(seg); seg = null; }
  }
  if (seg) inlineSegs.push(seg);
  // 高度变化（非 inlineH 段内，即动画前后）
  const hChanges = [];
  for (let i = 1; i < log.length; i++) {
    if (log[i].h !== log[i - 1].h && !log[i].inlineH) {
      hChanges.push({ t: log[i].t, from: log[i - 1].h, to: log[i].h });
    }
  }
  return { total: log.length, firstT: log[0].t, lastT: log[log.length - 1].t, inlineSegs: inlineSegs.slice(-6), hChanges: hChanges.slice(-10) };
})();
