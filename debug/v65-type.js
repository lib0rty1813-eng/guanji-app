// 输入 5 字并采样（验证单行预览 + dialog 高度恒定）
(async () => {
  const input = document.getElementById('addInput');
  input.value = 'abcde';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 150));
  const g = (el) => {
    const b = el.getBoundingClientRect();
    return { y: Math.round(b.y), h: Math.round(b.height), bottom: Math.round(b.bottom) };
  };
  return {
    countText: document.getElementById('addCount').textContent,
    previewText: document.getElementById('addPreview').textContent,
    previewRect: g(document.getElementById('addPreview')),
    dialogRect: g(document.querySelector('#addBackdrop .dialog')),
    phoneH: g(document.querySelector('.phone')),
    sheetRect: g(document.querySelector('.sheet'))
  };
})();
