// 真机验证液态玻璃开关：我的页 → 切换 → 检查类与存储
(async () => {
  document.querySelector('.tab[data-screen="me"]').click();
  await new Promise((r) => setTimeout(r, 300));
  const sw = document.getElementById('liquidGlassSwitch');
  const before = {
    switchOn: sw.classList.contains('on'),
    htmlGlass: document.documentElement.classList.contains('liquid-glass')
  };
  sw.click();
  await new Promise((r) => setTimeout(r, 200));
  const after = {
    switchOn: sw.classList.contains('on'),
    htmlGlass: document.documentElement.classList.contains('liquid-glass'),
    stored: localStorage.getItem('guanji_liquid_glass')
  };
  sw.click();   // 恢复
  return { before, after };
})();
