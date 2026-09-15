(() => {
  const draft = new URLSearchParams(location.search).get('draft') === '1' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const events = [];
  const resourceErrors = [];
  const longFrames = [];
  const keys = new Set();
  const inputState = { pointer: { x: 0, y: 0, down: false }, touches: 0 };
  let created = 0, destroyed = 0, peakActiveObjectCount = 0, lastGameState = document.body.dataset.gameState || 'unknown';
  let frames = 0, lastSecond = performance.now(), fps = 0, frozen = !draft;
  const record = (type, detail = {}) => { events.push({ type, detail, at: performance.now() }); if (events.length > 80) events.shift(); };
  addEventListener('error', event => { const target = event.target; if (target && target !== window && target.src) resourceErrors.push(String(target.src)); }, true);
  addEventListener('forge:rule', event => record('rule', event.detail || {}));
  addEventListener('forge:collision', event => record('collision', event.detail || {}));
  addEventListener('keydown', event => { keys.add(event.key); record('input', { kind: 'keyboard', key: event.key, active: true }); });
  addEventListener('keyup', event => { keys.delete(event.key); record('input', { kind: 'keyboard', key: event.key, active: false }); });
  addEventListener('pointerdown', event => { inputState.pointer = { x: event.clientX, y: event.clientY, down: true }; record('input', { kind: 'pointer', active: true }); });
  addEventListener('pointermove', event => { inputState.pointer.x = event.clientX; inputState.pointer.y = event.clientY; });
  addEventListener('pointerup', () => { inputState.pointer.down = false; record('input', { kind: 'pointer', active: false }); });
  addEventListener('touchstart', event => { inputState.touches = event.touches.length; record('input', { kind: 'touch', count: event.touches.length }); }, { passive: true });
  addEventListener('touchend', event => { inputState.touches = event.touches.length; }, { passive: true });
  new MutationObserver(entries => { for (const entry of entries) { if (entry.type === 'childList') { created += entry.addedNodes.length; destroyed += entry.removedNodes.length; } else { const next = document.body.dataset.gameState || 'unknown'; if (next !== lastGameState) { record('state', { from: lastGameState, to: next }); lastGameState = next; } } } }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-game-state'] });
  const tick = now => { frames++; const delta = now - lastSecond; if (delta >= 1000) { fps = Math.round(frames * 1000 / delta); if (delta / Math.max(frames, 1) > 34) longFrames.push(delta / Math.max(frames, 1)); frames = 0; lastSecond = now; } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const safeAsset = value => typeof value === 'string' && /^assets\/[A-Za-z0-9._/-]+$/.test(value) && !value.includes('..');
  const api = {
    version: '1.1.0',
    snapshot: () => { const debug = window.__GAME_DEBUG__?.getState?.() || null; const runtime = debug?.runtime || debug || {}; const activeObjectCount = Object.values(runtime).reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0); peakActiveObjectCount = Math.max(peakActiveObjectCount, activeObjectCount); const audio = [...document.querySelectorAll('audio')]; const memoryBytes = Number.isFinite(performance.memory?.usedJSHeapSize) ? performance.memory.usedJSHeapSize : null; return { gameState: document.body.dataset.gameState || 'unknown', fps, resourceErrors: [...resourceErrors], longFrameCount: longFrames.length, activeObjectCount, peakActiveObjectCount, objectStats: { created, destroyed }, inputState: { keys: [...keys], pointer: { ...inputState.pointer }, touches: inputState.touches }, audioState: { elements: audio.length, playing: audio.filter(node => !node.paused).length, muted: audio.filter(node => node.muted).length }, memoryBytes, events: [...events], debug, frozen }; },
    applyDraftPatch: patch => {
      if (frozen) return { ok: false, reason: '当前是冻结构建' };
      if (patch?.kind === 'css-variable' && /^--[a-z0-9-]+$/.test(patch.name) && typeof patch.value === 'string') { document.documentElement.style.setProperty(patch.name, patch.value); record('hot-patch', patch); return { ok: true }; }
      if (patch?.kind === 'image-source' && safeAsset(patch.value)) { const node = document.querySelector(patch.selector); if (node instanceof HTMLImageElement) { node.src = patch.value; record('hot-patch', patch); return { ok: true }; } }
      if (patch?.kind === 'runtime-parameter' && ['game-speed', 'spawn-rate', 'feedback-intensity'].includes(patch.name) && Number.isFinite(patch.value)) { const ranges = { 'game-speed': [0.25, 3], 'spawn-rate': [0.25, 4], 'feedback-intensity': [0, 2] }; const [minimum, maximum] = ranges[patch.name]; if (patch.value >= minimum && patch.value <= maximum) { dispatchEvent(new CustomEvent('forge:hot-parameter', { detail: { name: patch.name, value: patch.value } })); record('hot-patch', patch); return { ok: true }; } }
      return { ok: false, reason: '补丁不在安全热更新范围内' };
    },
    freeze: () => { frozen = true; record('freeze'); },
  };
  Object.defineProperty(window, '__FORGE_INSPECTOR__', { value: Object.freeze(api), configurable: false, writable: false });
})();