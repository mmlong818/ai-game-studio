// Keep copies identical: each official game ships as an independent artifact.
export function createQuality({cores = 8, memory = 8, maxDpr = 1.5} = {}) {
  const profiles = [
    {name: 'high', dpr: maxDpr, pixels: 1600000, shadow: 2048, particles: 1},
    {name: 'balanced', dpr: 1, pixels: 1000000, shadow: 1024, particles: .7},
    {name: 'low', dpr: .75, pixels: 600000, shadow: 512, particles: .5},
  ];
  let tier = cores <= 4 || memory <= 4 ? 1 : 0;
  let elapsed = 0, warmup = 2000, samples = [], bad = 0, p90 = 0;
  return {
    profile: () => ({...profiles[tier], p90}),
    ratio: (width, height, deviceDpr = 1) => Math.min(deviceDpr, profiles[tier].dpr, Math.sqrt(profiles[tier].pixels / Math.max(1, width * height))),
    reset() { elapsed = 0; samples = []; bad = 0; warmup = 1000; },
    sample(ms) {
      if (!Number.isFinite(ms) || ms <= 0) return false;
      if (warmup > 0) { warmup -= ms; return false; }
      elapsed += ms; samples.push(ms);
      if (elapsed < 2000) return false;
      samples.sort((a,b) => a-b); p90 = samples[Math.floor((samples.length-1)*.9)];
      bad = p90 > 24 ? bad + 1 : 0;
      elapsed = 0; samples = [];
      if (bad < 2 || tier === 2) return false;
      tier++; bad = 0; warmup = 1000; return true;
    },
  };
}

// Changes rendering cost only: physics, opponents, input and feedback stay intact.
export function attachQuality(renderer, sun, maxDpr) {
  const quality = createQuality({cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory, maxDpr});
  let last = 0, shadowSize = 0;
  function resize() {
    renderer.setPixelRatio(quality.ratio(innerWidth, innerHeight, devicePixelRatio));
    renderer.setSize(innerWidth, innerHeight, false);
    const size = quality.profile().shadow;
    if (size !== shadowSize) {
      sun.shadow.map?.dispose(); sun.shadow.map = null;
      sun.shadow.mapSize.set(size, size); shadowSize = size;
      renderer.shadowMap.needsUpdate = true;
    }
  }
  resize();
  document.addEventListener('visibilitychange', () => { last = 0; quality.reset(); });
  return {
    resize,
    frame() {
      if (document.hidden) { last = 0; return false; }
      const now = performance.now();
      if (last && quality.sample(now-last)) resize();
      last = now; return true;
    },
    state: () => ({...quality.profile(), pixelRatio: renderer.getPixelRatio(), width: renderer.domElement.width, height: renderer.domElement.height}),
  };
}

