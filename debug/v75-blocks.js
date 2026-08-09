// 真机：两态各区块高度明细（找差异来源）
(async () => {
  const sheet = document.getElementById('recordSheet');
  const g = (id) => {
    const el = document.getElementById(id);
    return el && !el.classList.contains('hidden') ? Math.round(el.getBoundingClientRect().height) : null;
  };
  const total = () => Math.round(sheet.getBoundingClientRect().height);
  // 就现在
  if (!document.getElementById('nowSeg').classList.contains('active')) {
    document.getElementById('nowSeg').click();
    await new Promise((r) => setTimeout(r, 400));
  }
  const now = {
    total: total(),
    grab: g('recordGrab'),
    title: Math.round(document.querySelector('#recordSheet .sheet-title').getBoundingClientRect().height),
    label: Math.round(document.querySelector('#stepTime .field-label').getBoundingClientRect().height),
    seg: g('timeSegRow'),
    timerBox: g('timerBox'),
    timerDisplay: g('timerDisplay'),
    timerHint: document.querySelector('.timer-hint') ? Math.round(document.querySelector('.timer-hint').getBoundingClientRect().height) : null,
    modeLink: g('modeLink'),
    actions: g('sheetActions')
  };
  // 补记
  document.getElementById('customSeg').click();
  await new Promise((r) => setTimeout(r, 400));
  const bf = {
    total: total(),
    timeDisplay: g('timeDisplay'),
    pickerRow: g('pickerRow'),
    pickDate: document.getElementById('pickDate') ? Math.round(document.getElementById('pickDate').getBoundingClientRect().height) : null
  };
  return { now, bf, diff: now.total - bf.total };
})();
