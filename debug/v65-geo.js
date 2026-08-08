// #65 复测：输出关键几何（html/body/.phone 高度、sheet/dialog 位置、视口状态）
(async () => {
  const g = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { y: Math.round(b.y), h: Math.round(b.height), bottom: Math.round(b.bottom) };
  };
  return {
    innerHeight: window.innerHeight,
    baseH: window.BASE_VIEWPORT_H,
    kbFrozen: window.kbFrozen,
    htmlH: document.documentElement.style.height,
    bodyH: document.body.style.height,
    htmlRectH: Math.round(document.documentElement.getBoundingClientRect().height),
    phoneH: g(document.querySelector('.phone')),
    sheetH: g(document.querySelector('.sheet')),
    dialogH: g(document.querySelector('#addBackdrop .dialog')),
    previewText: (document.getElementById('addPreview') || {}).textContent,
    scrollY: Math.round(window.scrollY),
    tabbarHidden: document.getElementById('tabbar').classList.contains('keyboard-up')
  };
})();
