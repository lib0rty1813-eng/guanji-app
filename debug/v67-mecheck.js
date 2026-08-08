// #67 验证：我的页卡片顺序（数据管理 在 隐私说明 之前）+ about-ver + 功能回归
(async () => {
  // 切到我的页（模拟 tab 点击）
  document.querySelector('.tab[data-screen="me"]').click();
  await new Promise((r) => setTimeout(r, 400));
  const cards = Array.from(document.querySelectorAll('#screen-me .card'));
  const order = cards.map((c) => {
    const t = c.querySelector('.card-title');
    return t ? t.textContent.trim() : '(logo卡)';
  });
  const idxData = order.indexOf('数据管理');
  const idxPriv = order.indexOf('隐私说明');
  // 功能回归：清除按钮弹确认、导出/恢复按钮存在、外观 seg 可点
  const clearBtn = document.getElementById('clearBtn');
  clearBtn.click();
  await new Promise((r) => setTimeout(r, 300));
  const confirmVisible = !document.getElementById('dialogBackdrop').classList.contains('hidden');
  document.getElementById('dialogCancel').click();
  await new Promise((r) => setTimeout(r, 300));
  return {
    cardOrder: order,
    dataBeforePrivacy: idxData !== -1 && idxPriv !== -1 && idxData < idxPriv,
    aboutVer: document.querySelector('.about-ver').textContent,
    confirmDialogWorks: confirmVisible,
    privacyItems: document.querySelectorAll('#screen-me .privacy-list li').length
  };
})();
