// 真机验证：液态玻璃在 App 的 tabbar/sheet 生效 + 功能回归
(async () => {
  const cs = (el, p) => getComputedStyle(el)[p];
  const tabbar = document.querySelector('.tabbar');
  const sheet = document.getElementById('recordSheet');
  const ring = getComputedStyle(sheet, '::after');
  const band = getComputedStyle(tabbar, '::before');
  const result = {
    tabbarBackdrop: cs(tabbar, 'backdropFilter'),
    sheetBackdrop: cs(sheet, 'backdropFilter'),
    sheetBg: cs(sheet, 'backgroundColor'),
    ringGradient: ring.backgroundImage.includes('linear-gradient'),
    ringMask: ring.maskComposite || ring.webkitMaskComposite,
    bandLight: band.backgroundImage.includes('radial-gradient'),
    tabbarRadius: cs(tabbar, 'borderRadius'),
    animeLoaded: typeof window.anime === 'function'
  };
  // 打开面板（供后续分离式验证弹簧）
  openSheet('now');
  return result;
})();
