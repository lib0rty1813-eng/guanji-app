// 真机验证：日历弹层 blur 3px + 其余浮层不变
(async () => {
  openCalendar();
  await new Promise((r) => setTimeout(r, 500));
  const cal = document.getElementById('calendarSheet');
  const cs = (el, p) => getComputedStyle(el)[p];
  const r = {
    calendarBlur: cs(cal, 'backdropFilter'),
    sheetBlur: cs(document.getElementById('recordSheet'), 'backdropFilter'),
    tabbarBlur: cs(document.querySelector('.tabbar'), 'backdropFilter'),
    calendarVisible: !cal.classList.contains('hidden')
  };
  closeCalendar();
  return r;
})();
