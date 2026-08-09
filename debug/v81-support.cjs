// 真机 WebView 支持性检测：backdrop-filter url() 引用 SVG filter（方案 C 关键决策点）
(async () => {
  const out = {};
  out.supportsBackdropUrl = CSS.supports('backdrop-filter', 'url(#x) blur(1px)');
  out.supportsBackdropUrlWebkit = CSS.supports('-webkit-backdrop-filter', 'url(#x) blur(1px)');
  out.supportsFilterUrl = CSS.supports('filter', 'url(#x)');
  out.ua = navigator.userAgent.slice(0, 120);
  // 真实渲染验证：给 body 挂一个带 SVG 位移滤镜的元素，读 computed filter
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.innerHTML = '<defs><filter id="__test_disp"><feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="20" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';
  document.body.appendChild(svg);
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;width:40px;height:40px;filter:url(#__test_disp);background:red;left:-999px';
  document.body.appendChild(probe);
  out.filterComputed = getComputedStyle(probe).filter;
  out.supportsBackdropUrl2 = CSS.supports('backdrop-filter', 'url(#__test_disp) blur(0.25px)');
  probe.remove(); svg.remove();
  return JSON.stringify(out);
})();
