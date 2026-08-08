// 读取键盘状态模块变量（裸标识符；const/let 不进 window）
(async () => ({
  kbBase,
  innerHeight,
  htmlInline: document.documentElement.style.height,
  bodyInline: document.body.style.height,
  isUp: isKeyboardUp()
}))();
