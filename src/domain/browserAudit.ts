import type { ViewportObservation } from "./experience";
import type { RuntimeFiles } from "./runtimeGenerator";

const parseViewport = (value: string): { width: number; height: number } => {
  const [width, height] = value.split("x").map(Number);
  if (!width || !height) throw new Error(`视口格式无效：${value}`);
  return { width, height };
};

const inlineRuntime = (files: RuntimeFiles): string =>
  files["index.html"]
    .replace('<link rel="stylesheet" href="./styles.css" />', `<style>${files["styles.css"]}</style>`)
    .replace(
      '<script type="module" src="./app.js"></script>',
      `<script>window.__auditErrors=[];addEventListener('error',event=>window.__auditErrors.push(event.message));</script><script>${files["app.js"]}</script>`,
    );

const intersects = (left: DOMRect, right: DOMRect): boolean =>
  left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;

const measureFrames = async (frameWindow: Window, frameCount = 45): Promise<{ averageFps: number; p95FrameMs: number }> => {
  const samples: number[] = [];
  await new Promise<void>((resolve) => {
    let previous = 0;
    const sample = (timestamp: number) => {
      if (previous > 0) samples.push(timestamp - previous);
      previous = timestamp;
      if (samples.length >= frameCount) resolve();
      else frameWindow.requestAnimationFrame(sample);
    };
    frameWindow.requestAnimationFrame(sample);
  });
  const sorted = [...samples].sort((a, b) => a - b);
  const averageMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return {
    averageFps: Math.round((1000 / averageMs) * 10) / 10,
    p95FrameMs: Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] * 10) / 10,
  };
};

export async function auditRuntimeInBrowser(
  files: RuntimeFiles,
  viewports: string[],
  assetUrls: string[],
): Promise<ViewportObservation[]> {
  const assetResults = await Promise.all(
    assetUrls.map(async (url) => {
      try {
        return (await fetch(url, { cache: "no-store" })).ok;
      } catch {
        return false;
      }
    }),
  );
  const missingAssets = assetResults.filter((result) => !result).length;
  const observations: ViewportObservation[] = [];
  for (const viewport of viewports) {
    const { width, height } = parseViewport(viewport);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;border:0`;
    iframe.srcdoc = inlineRuntime(files);
    document.body.appendChild(iframe);
    try {
      await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error(`${viewport} 预览加载超时`)), 5000);
      iframe.addEventListener("load", () => {
        window.clearTimeout(timeout);
        resolve();
      }, { once: true });
      });
      const frameWindow = iframe.contentWindow;
      const frameDocument = iframe.contentDocument;
      if (!frameWindow || !frameDocument) throw new Error(`${viewport} 无法访问预览文档`);
      let longTaskCount = 0;
      let observer: PerformanceObserver | null = null;
      try {
        const Observer = (frameWindow as unknown as { PerformanceObserver?: typeof PerformanceObserver }).PerformanceObserver;
        if (Observer) {
          observer = new Observer((list: PerformanceObserverEntryList) => { longTaskCount += list.getEntries().length; });
          observer.observe({ entryTypes: ["longtask"] });
        }
      } catch {
        observer = null;
      }
      const start = frameDocument.querySelector<HTMLButtonElement>("#start");
      const game = frameDocument.querySelector<HTMLElement>("#game");
      const controls = frameDocument.querySelector<HTMLElement>(".controls");
      const inputStartedAt = frameWindow.performance.now();
      start?.click();
      game?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      const inputLatencyMs = Math.round((frameWindow.performance.now() - inputStartedAt) * 10) / 10;
      const frameMetrics = await measureFrames(frameWindow);
      observer?.disconnect();
      const status = frameDocument.querySelector("#status")?.textContent ?? "";
      const buttonSizes = Array.from(frameDocument.querySelectorAll("button")).map((button) =>
        Math.min(button.getBoundingClientRect().width, button.getBoundingClientRect().height),
      );
      const gameRect = game?.getBoundingClientRect();
      const controlsRect = controls?.getBoundingClientRect();
      const errors = (frameWindow as unknown as { __auditErrors?: string[] }).__auditErrors ?? [];
      const memory = (frameWindow.performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      let screenshotDataUrl: string | null = null;
      try {
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(frameDocument.body, {
          width,
          height,
          windowWidth: width,
          windowHeight: height,
          useCORS: true,
          logging: false,
          backgroundColor: "#edf5ed",
        });
        screenshotDataUrl = canvas.toDataURL("image/jpeg", 0.78);
      } catch {
        screenshotDataUrl = null;
      }
      observations.push({
      viewport,
      coreLoopCompleted: Boolean(start && game && status !== "准备开始"),
      horizontalOverflow: frameDocument.documentElement.scrollWidth > width + 1,
      controlsObscurePlayfield: Boolean(gameRect && controlsRect && intersects(gameRect, controlsRect)),
      minimumTouchTargetPx: buttonSizes.length > 0 ? Math.min(...buttonSizes) : 0,
      ...frameMetrics,
      inputLatencyMs,
      longTaskCount,
      heapUsedMb: memory ? Math.round(memory.usedJSHeapSize / 104857.6) / 10 : null,
      screenshotDataUrl,
      consoleErrors: errors.length,
      missingAssets,
      reducedMotionSupported: files["styles.css"].includes("prefers-reduced-motion"),
      focusVisible: files["styles.css"].includes("focus-visible"),
      audioCanMute: Boolean(frameDocument.querySelector("#mute")),
      audioCanResume: Boolean((frameWindow as unknown as { __audioController?: { resume?: unknown } }).__audioController?.resume),
      pausesOnBlur: files["app.js"].includes("addEventListener('blur'") || files["app.js"].includes('addEventListener("blur"'),
      });
    } finally {
      iframe.remove();
    }
  }
  return observations;
}
