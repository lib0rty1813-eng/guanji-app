// #65 验证脚本：打开添加对话框 → 输入 5 字 → 检查单行预览与几何（无重叠、无顶起）
(async () => {
  const $ = (id) => document.getElementById(id);

  // 1) 打开情绪添加对话框
  openAddDialog('mood');
  await new Promise((r) => setTimeout(r, 350));

  const input = $('addInput');
  // 2) 模拟输入 5 个字（触发 input 事件走 #65 单行逻辑）
  input.value = 'abcde';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 100));

  // 3) 几何采样
  const rect = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom) };
  };
  const dialog = document.querySelector('#addBackdrop .dialog');
  const countR = rect($('addCount'));
  const prevR = rect($('addPreview'));
  const dialogR = rect(dialog);

  const result = {
    countText: $('addCount').textContent,
    previewText: $('addPreview').textContent,
    innerHeight: window.innerHeight,
    visualViewportHeight: window.visualViewport ? Math.round(window.visualViewport.height) : null,
    countRect: countR,
    previewRect: prevR,
    dialogRect: dialogR,
    // 重叠判定：两元素若有内容应合并为单行（count 恒空），预览独占一行且位于输入框下方
    overlap: countR && prevR ? !(prevR.y >= countR.bottom - 1 || countR.y >= prevR.bottom - 1) : null,
    dialogVisible: dialogR && dialogR.h > 0,
    cssMarginTop: getComputedStyle($('addPreview')).marginTop
  };
  return result;
})();
