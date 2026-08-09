// 真机验证 P1+P2：滚动收缩 + 图标底座 + 色散
(async () => {
  const tabbar = document.getElementById('tabbar');
  const screen = document.getElementById('screen-home');
  const activeTab = document.querySelector('.tab.active');
  const base = getComputedStyle(activeTab, '::before');
  const num = document.querySelector('.stat-num, .focus-num');
  const r = { glassOn: document.documentElement.classList.contains('liquid-glass') };
  // 图标底座 + 色散
  r.tabBase = base.backgroundImage.includes('radial-gradient') && base.boxShadow.includes('inset');
  r.dispersion = num ? getComputedStyle(num).textShadow.includes('255, 59, 92') : null;
  // 滚动收缩
  screen.scrollTop = 300;
  screen.dispatchEvent(new Event('scroll'));
  await new Promise((res) => setTimeout(res, 400));
  r.scrolled = {
    active: tabbar.classList.contains('scrolled'),
    h: Math.round(tabbar.getBoundingClientRect().height),
    bg: getComputedStyle(tabbar).backgroundColor
  };
  // 恢复
  screen.scrollTop = 0;
  screen.dispatchEvent(new Event('scroll'));
  return r;
})();
