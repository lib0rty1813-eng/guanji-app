// 取输入框屏幕坐标（含 dpr，供 adb tap 换算）
(async () => {
  const b = document.getElementById('addInput').getBoundingClientRect();
  return {
    x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
    centerX: Math.round(b.x + b.width / 2), centerY: Math.round(b.y + b.height / 2),
    dpr: window.devicePixelRatio
  };
})();
