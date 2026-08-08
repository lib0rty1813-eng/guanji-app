// #65 键盘弹出态复测：对话框位置 / 预览行几何 / 页面是否被拉扯
(async () => {
  await new Promise((r) => setTimeout(r, 600)); // 等键盘动画稳定
  const rect = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom) };
  };
  const dialog = document.querySelector('#addBackdrop .dialog');
  return {
    countText: document.getElementById('addCount').textContent,
    previewText: document.getElementById('addPreview').textContent,
    innerHeight: window.innerHeight,
    docHeight: document.documentElement.scrollHeight,
    visualViewportHeight: window.visualViewport ? Math.round(window.visualViewport.height) : null,
    visualViewportOffsetTop: window.visualViewport ? Math.round(window.visualViewport.offsetTop) : null,
    scrollY: Math.round(window.scrollY),
    dialogRect: rect(dialog),
    previewRect: rect(document.getElementById('addPreview')),
    inputFocused: document.activeElement && document.activeElement.id === 'addInput'
  };
})();
