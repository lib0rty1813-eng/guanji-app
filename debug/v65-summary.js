// 汇总页风格验证：起计时→结束进汇总→开添加对话框（键盘弹起）→采样
(async () => {
  const g = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { y: Math.round(b.y), h: Math.round(b.height), bottom: Math.round(b.bottom) };
  };
  // 1) 进入计时并结束（时长 ≥1 分钟直接入汇总）
  startTimedRecord();
  await new Promise((r) => setTimeout(r, 800));
  finishTimedRecord();
  await new Promise((r) => setTimeout(r, 800));
  const summaryVisible = !!document.querySelector('#timerSummaryView') &&
    getComputedStyle(document.querySelector('#timerSummaryView')).display !== 'none';

  // 2) 汇总页里打开诱因添加对话框（JS focus 会召起真实键盘）
  openAddDialog('trigger');
  await new Promise((r) => setTimeout(r, 700));

  const input = document.getElementById('addInput');
  input.value = '夜宵';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 150));

  const result = {
    summaryVisible,
    kbBase,
    innerHeight,
    htmlInline: document.documentElement.style.height,
    isUp: isKeyboardUp(),
    summaryTitleMT: getComputedStyle(document.querySelector('.summary-title')).marginTop,
    dialogRect: g(document.querySelector('#addBackdrop .dialog')),
    previewText: document.getElementById('addPreview').textContent,
    countText: document.getElementById('addCount').textContent,
    timerScreenVisible: !!document.querySelector('#timerScreen') && getComputedStyle(document.querySelector('#timerScreen')).display !== 'none'
  };
  // 3) 清理：放弃汇总（不保存）
  abandonSummary();
  return result;
})();
