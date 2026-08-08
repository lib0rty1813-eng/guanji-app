// #68 验证：about-card 内部结构（品牌区 + 分隔线 + 隐私区）+ 卡片总数
(async () => {
  const card = document.querySelector('#screen-me .card.about-card');
  const g = (el) => {
    const b = el.getBoundingClientRect();
    return { y: Math.round(b.y), h: Math.round(b.height) };
  };
  const brand = card.querySelector('.about-name');
  const priv = card.querySelector('.about-privacy');
  const ver = card.querySelector('.about-ver');
  const border = getComputedStyle(priv).borderTop;
  return {
    cardCount: document.querySelectorAll('#screen-me .card').length,
    hasLogo: !!card.querySelector('.logo-mark'),
    aboutName: brand.textContent,
    aboutVer: ver.textContent,
    brandY: g(brand).y,
    privY: g(priv).y,
    privBorderTop: border,
    privAlign: getComputedStyle(priv).textAlign,
    privacyItems: priv.querySelectorAll('li').length,
    privacyTexts: Array.from(priv.querySelectorAll('li')).map((li) => li.textContent.trim())
  };
})();
