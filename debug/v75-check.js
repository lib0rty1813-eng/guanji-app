// 真机验证：两态高度一致 + 就现在无日期时间
(async () => {
  const sheet = document.getElementById('recordSheet');
  const g = () => Math.round(sheet.getBoundingClientRect().height);
  const td = () => !document.getElementById('timeDisplay').classList.contains('hidden');
  // 当前应是补记态（刚才点了补记）——先切回就现在再测
  if (document.getElementById('nowSeg').classList.contains('active')) {
    // 已在就现在
  } else {
    document.getElementById('nowSeg').click();
    await new Promise((r) => setTimeout(r, 400));
  }
  const now = { h: g(), td: td() };
  document.getElementById('customSeg').click();
  await new Promise((r) => setTimeout(r, 400));
  const bf = { h: g(), td: td() };
  document.getElementById('nowSeg').click();
  await new Promise((r) => setTimeout(r, 400));
  const back = { h: g(), td: td() };
  return { now, bf, back, diff: now.h - bf.h };
})();
