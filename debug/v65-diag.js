// 诊断：phone 高度异常来源
(async () => {
  const phone = document.querySelector('.phone');
  const cs = getComputedStyle(phone);
  const bodyCs = getComputedStyle(document.body);
  const stageCs = getComputedStyle(document.querySelector('.stage'));
  return {
    mqCoarse: matchMedia('(max-width: 420px) and (pointer: coarse)').matches,
    mqWidth: matchMedia('(max-width: 420px)').matches,
    dpr: window.devicePixelRatio,
    phoneCount: document.querySelectorAll('.phone').length,
    phoneCS: { height: cs.height, width: cs.width, display: cs.display, position: cs.position },
    bodyCS: { height: bodyCs.height, minHeight: bodyCs.minHeight, display: bodyCs.display },
    stageCS: { padding: stageCs.padding },
    bodyRectH: Math.round(document.body.getBoundingClientRect().height),
    stageRectH: Math.round(document.querySelector('.stage').getBoundingClientRect().height),
    visualViewport: window.visualViewport ? { w: Math.round(window.visualViewport.width), h: Math.round(window.visualViewport.height), scale: window.visualViewport.scale } : null
  };
})();
