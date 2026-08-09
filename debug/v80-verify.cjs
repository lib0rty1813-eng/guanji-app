// 真机 CDP 验证 #76/#77/#79/#80（2026-08-09，v3.5 内补丁）
// 用法: node debug/cdp-eval.cjs debug/v80-verify.cjs
(async () => {
  const out = {};
  out.cssVer = document.querySelector('link[rel="stylesheet"]').href.split('v=')[1];
  out.lg = document.documentElement.classList.contains('liquid-glass');

  // #76: 选中胶囊
  const active = document.querySelector('.tab.active');
  const slide = document.querySelector('.tab-slide');
  const cs = active ? getComputedStyle(active, '::before') : null;
  out.tabActive = active ? active.textContent.trim() : null;
  out.slideDisplay = slide ? getComputedStyle(slide).display : 'no-element';
  out.capsule = cs ? { top: cs.top, bottom: cs.bottom, left: cs.left, right: cs.right, radius: cs.borderRadius } : null;

  // #77: tabbar 高度（滚动后）
  const scr = document.querySelector('.screen:not(.hidden)');
  scr.scrollTop = scr.scrollHeight;
  scr.dispatchEvent(new Event('scroll'));
  await new Promise((r) => setTimeout(r, 350));
  const bar = document.querySelector('.tabbar');
  out.tabbarHAfterScroll = Math.round(bar.getBoundingClientRect().height * 10) / 10;
  out.scrolledClass = bar.classList.contains('scrolled');
  scr.scrollTop = 0;
  scr.dispatchEvent(new Event('scroll'));

  // #80: 未来 cell
  const btn = document.getElementById('backfillBtn');
  if (btn) { btn.click(); await new Promise((r) => setTimeout(r, 600)); }
  const grid = document.getElementById('calGrid');
  const cells = grid ? [...grid.querySelectorAll('.cal-cell')] : [];
  const futureCells = cells.filter((c) => Number(c.dataset.off) > 0);
  out.futureCount = futureCells.length;
  out.futureDisabledAll = futureCells.length > 0 && futureCells.every((c) => c.disabled);
  out.futureClassAll = futureCells.length > 0 && futureCells.every((c) => c.classList.contains('future'));
  out.futureColor = futureCells[0] ? getComputedStyle(futureCells[0]).color : null;

  // #79: 明细 .dur
  records.push({ id: 'v80-test', offset: 0, time: '10:30', duration: 25, moods: ['平静'], triggers: ['工作'], media: false, note: 'v80' });
  renderCalDayDetail();
  const dur = document.querySelector('#calDayDetail .recent-tags .dur');
  out.dur = dur ? { text: dur.textContent.trim(), color: getComputedStyle(dur).color, weight: getComputedStyle(dur).fontWeight } : null;
  records = records.filter((r) => r.id !== 'v80-test');
  renderCalDayDetail();

  return JSON.stringify(out);
})();
