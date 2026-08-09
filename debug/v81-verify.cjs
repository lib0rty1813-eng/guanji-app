// 真机 CDP 验证 #81（方案 C 定稿：液体变形 tab 切换，强度 20，无背景折射）
(async () => {
  const out = {};
  out.cssVer = document.querySelector('link[rel="stylesheet"]').href.split('v=')[1];
  out.lg = document.documentElement.classList.contains('liquid-glass');

  // 玻璃态滑块材质 + 滤镜
  const slide = document.getElementById('tabSlide');
  const cs = getComputedStyle(slide);
  out.slideDisplay = cs.display;
  out.slideRadius = cs.borderRadius;
  out.slideFilter = cs.filter;
  out.slideBg = cs.background.slice(0, 80);
  out.pseudoContent = getComputedStyle(document.querySelector('.tab.active'), '::before').content;
  out.svgDispExists = !!document.getElementById('lg-disp');

  // 切换脉冲采样（0→20→0）
  const disp = document.getElementById('lg-disp');
  const samples = [];
  const t0 = performance.now();
  await new Promise((res) => {
    (function tick() {
      samples.push(parseFloat(disp.getAttribute('scale')) || 0);
      if (performance.now() - t0 < 720) requestAnimationFrame(tick);
      else res();
    })();
    document.querySelectorAll('.tab')[1].click();
  });
  out.maxScale = Math.max(...samples);
  out.finalScale = samples[samples.length - 1];
  out.peakFrames = samples.filter((s) => Math.abs(s) > 15).length;

  // 非玻璃态回归
  document.documentElement.classList.remove('liquid-glass');
  const cs2 = getComputedStyle(slide);
  out.plainFilter = cs2.filter;
  out.plainRadius = cs2.borderRadius;
  out.plainBg = cs2.background.slice(0, 50);
  document.documentElement.classList.add('liquid-glass');

  return JSON.stringify(out);
})();
