// #66 采样：打开 sheet 后连续采样几何（找「弹出一部分卡一下」的动画形态）
// 用法：node cdp-eval.cjs v66-anim-sampler.js now|edit|backfill|quick
(async () => {
  const mode = __ARG || 'now';

  // 准备：回到可打开状态
  closeSheet();
  await new Promise((r) => setTimeout(r, 450));

  const sheet = document.getElementById('recordSheet');
  const samples = [];
  const t0 = performance.now();

  if (mode === 'edit') {
    // 找一条最近的记录进入编辑
    const rec = records.length ? records[records.length - 1] : null;
    if (!rec) return { error: 'no records' };
    openEditRecord(rec.id);
  } else if (mode === 'backfill') {
    openSheet('backfill', dateWithOffset(0));
  } else if (mode === 'quick') {
    openSheet('quick');
  } else {
    openSheet('now');
  }

  // 打开后 0-700ms 每 30ms 采样 sheet 几何 + transform/height 内联
  await new Promise((resolve) => {
    let last = 0;
    const iv = setInterval(() => {
      const t = Math.round(performance.now() - t0);
      const b = sheet.getBoundingClientRect();
      samples.push({
        t,
        y: Math.round(b.y),
        h: Math.round(b.height),
        bottom: Math.round(b.bottom),
        inlineH: sheet.style.height || '',
        inlineTransform: sheet.style.transform ? 'set' : '',
        inlineTransition: sheet.style.transition ? 'set' : ''
      });
      if (t > 700) { clearInterval(iv); resolve(); }
    }, 30);
  });

  // 汇总：高度变化点 + 明显的停顿段
  const heightChanges = [];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].h !== samples[i - 1].h) heightChanges.push({ t: samples[i].t, h: samples[i].h });
  }
  return {
    mode,
    count: samples.length,
    samples,
    heightChanges: heightChanges.slice(0, 12)
  };
})();
