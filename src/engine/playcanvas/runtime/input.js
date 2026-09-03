// 引擎层 · 输入抽象（浏览器运行时片段）：键盘 / 触控按钮（[data-key]）/ 滑动 / 点击 → 抽象动作。
// options: { canvas, keyMap: { code: action | { action, always } }, preventCodes: [...], buttons: NodeList|Array, swipe: { minDistance, axisRatio },
//            enabled: () => boolean, onAction(action, source), onSwipe(dx, dy), onTap(clientX, clientY) }
// 语义：键盘忽略 event.repeat；always 的键（如暂停）在 enabled() 为假时也触发；按钮 disabled 时忽略；
// 滑动只在一次手势里触发一次，触发后本次抬起不再当作点击。

export function createInputController(options) {
  const o = options || {};
  const canvas = o.canvas;
  const keyMap = o.keyMap || {};
  const preventCodes = o.preventCodes || Object.keys(keyMap);
  const swipe = Object.assign({ minDistance: 42, axisRatio: 1.2 }, o.swipe || {});
  const enabled = typeof o.enabled === "function" ? o.enabled : () => true;
  const disposers = [];
  function listen(target, type, handler, opts) { target.addEventListener(type, handler, opts); disposers.push(() => target.removeEventListener(type, handler, opts)); }
  const keydown = (event) => {
    if (preventCodes.includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    const entry = keyMap[event.code];
    if (!entry) return;
    const action = typeof entry === "string" ? entry : entry.action;
    const always = typeof entry === "object" && entry.always;
    if (!always && !enabled()) return;
    if (o.onAction) o.onAction(action, "keyboard");
  };
  window.addEventListener("keydown", keydown);
  disposers.push(() => window.removeEventListener("keydown", keydown));
  // 触控按钮：pointerdown 触发，按住期间加 is-active。
  const buttons = o.buttons ? Array.from(o.buttons) : [];
  buttons.forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (button.disabled) return;
      button.classList.add("is-active");
      if (o.onAction) o.onAction(button.dataset.key, "button");
    });
    const release = () => button.classList.remove("is-active");
    listen(button, "pointerup", release); listen(button, "pointercancel", release); listen(button, "pointerleave", release);
  });
  // 画布手势：横向滑动 / 点击。
  const pointer = { down: false, x: 0, y: 0, moved: false, id: null };
  if (canvas) {
    canvas.addEventListener("pointerdown", (event) => {
      if (!enabled()) return;
      pointer.down = true; pointer.moved = false; pointer.x = event.clientX; pointer.y = event.clientY; pointer.id = event.pointerId;
      if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    });
    listen(canvas, "pointermove", (event) => {
      if (!pointer.down || event.pointerId !== pointer.id) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      if (!pointer.moved && Math.abs(dx) > swipe.minDistance && Math.abs(dx) > Math.abs(dy) * swipe.axisRatio) {
        pointer.moved = true;
        if (o.onSwipe) o.onSwipe(dx, dy);
      }
    });
    const endPointer = (event) => {
      if (!pointer.down || event.pointerId !== pointer.id) return;
      pointer.down = false;
      if (!pointer.moved && enabled() && o.onTap) o.onTap(event.clientX, event.clientY);
    };
    listen(canvas, "pointerup", endPointer);
    listen(canvas, "pointercancel", endPointer);
  }
  return {
    buttons,
    setButtonsEnabled(value) { buttons.forEach((button) => { button.disabled = !value; }); },
    dispose() { disposers.splice(0).forEach((off) => off()); },
  };
}
