import * as THREE from './vendor/three.module.js';
import { attachQuality } from './adaptive-quality.js';
import { track, RACERS, wrap, TAU, interpolateCar } from './race-core.js';
import { models } from './assets/models/kenney-models.js';

// Original scenery plus curated Kenney CC0 models. All resources are local.
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.setClearColor('#9edee8'); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#b2e3e5', 140, 480);
  const camera = new THREE.PerspectiveCamera(58, 1, .2, 1600);
  scene.add(new THREE.HemisphereLight('#e9fcff', '#ac98b4', 2.1));
  const sun = new THREE.DirectionalLight('#fff2cf', 3.1); sun.position.set(70, 350, 100);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -310, right: 310, top: 310, bottom: -310, near: 1, far: 800 });
  // Bake the static island once. Karts retain moving contact shadows without a second scene pass.
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  sun.shadow.bias = -.001; scene.add(sun, sun.target);
  const quality = attachQuality(renderer, sun, 1.25);
  const mats = new Map();
  const material = color => { if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true })); return mats.get(color); };
  const cube = new THREE.BoxGeometry(1, 1, 1), ball = new THREE.IcosahedronGeometry(1, 1);
  function mesh(geo, color, pos, scale = [1, 1, 1], parent = scene) {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? material(color) : color);
    m.position.set(...pos); m.scale.set(...scale); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (color, pos, scale, parent) => mesh(cube, color, pos, scale, parent);
  const modelGeometries = new Map();
  const natureMaterial = new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,side:THREE.DoubleSide});
  const kartMaterial = new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:.08});
  const tireMaterial = new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9});
  function model(name, parent, scale = 1, moving = false) {
    const group = new THREE.Group(); parent.add(group); group.scale.setScalar(scale);
    const paint=moving?kartMaterial.clone():null, rubber=moving?tireMaterial.clone():null;
    if(moving){paint.transparent=true;rubber.transparent=true;group.userData.fadeMaterials=[paint,rubber];}
    models[name].parts.forEach((part,index)=>{
      const key=name+':'+index;
      if(!modelGeometries.has(key)) {
        const geo=new THREE.BufferGeometry();
        for(const attr of ['position','normal','color'])geo.setAttribute(attr,new THREE.Float32BufferAttribute(part[attr],3));
        modelGeometries.set(key,geo);
      }
      const mat=moving?(part.name.startsWith('wheel-')?rubber:paint):natureMaterial;
      const m=mesh(modelGeometries.get(key),mat,[0,0,0],[1,1,1],group);m.name=part.name;
    });
    return group;
  }
  const roundedGeometries = new Map();
  const surfaceMaterials = new Map();
  const smoothBall = new THREE.SphereGeometry(1, 16, 12);
  function surface(color, type) {
    const key = color + ':' + type;
    if (!surfaceMaterials.has(key)) surfaceMaterials.set(key, new THREE.MeshStandardMaterial({color,
      roughness: type === 'rubber' ? .92 : type === 'metal' ? .32 : .38,
      metalness: type === 'metal' ? .55 : type === 'paint' ? .12 : 0}));
    return surfaceMaterials.get(key);
  }
  function rounded(color, pos, size, parent, type = 'paint') {
    const key = size.join(',');
    if (!roundedGeometries.has(key)) {
      const [w,h,d] = size, radius = Math.min(w,h,d) * .23;
      const geometry = new THREE.BoxGeometry(w,h,d,3,3,3), p = geometry.attributes.position, n = geometry.attributes.normal;
      const center = new THREE.Vector3(), point = new THREE.Vector3(), normal = new THREE.Vector3();
      for (let i=0;i<p.count;i++) {
        point.fromBufferAttribute(p,i);
        center.set(THREE.MathUtils.clamp(point.x,-w/2+radius,w/2-radius),THREE.MathUtils.clamp(point.y,-h/2+radius,h/2-radius),THREE.MathUtils.clamp(point.z,-d/2+radius,d/2-radius));
        normal.subVectors(point,center).normalize(); point.copy(center).addScaledVector(normal,radius);
        p.setXYZ(i,point.x,point.y,point.z); n.setXYZ(i,normal.x,normal.y,normal.z);
      }
      roundedGeometries.set(key,geometry);
    }
    return mesh(roundedGeometries.get(key),surface(color,type),pos,[1,1,1],parent);
  }
  function batchStatic(root, skip = new Set()) {
    root.updateMatrixWorld(true);
    const groups = new Map(), inverse = root.matrixWorld.clone().invert();
    root.traverse(m => {
      if (!m.isMesh || skip.has(m) || Array.isArray(m.material)) return;
      // Bound batches spatially: a material shared around the island must not defeat frustum culling.
      m.geometry.computeBoundingBox();
      const center = m.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(m.matrixWorld);
      const sector = root === scene ? `${Math.floor(center.x/200)},${Math.floor(center.z/200)}` : 'actor';
      const key = m.material.uuid + '/' + m.castShadow + '/' + m.receiveShadow + '/' + sector;
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m);
    });
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const geometries = list.map(m => {
        let g = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld));
        if (g.index) { const expanded = g.toNonIndexed(); g.dispose(); g = expanded; }
        return g;
      });
      const geo = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', ...(list[0].material.vertexColors ? ['color'] : [])]) {
        const size = geometries.reduce((n, g) => n + g.attributes[name].array.length, 0), values = new Float32Array(size);
        let offset = 0; for (const g of geometries) { values.set(g.attributes[name].array, offset); offset += g.attributes[name].array.length; }
        geo.setAttribute(name, new THREE.BufferAttribute(values, 3));
      }
      const merged = new THREE.Mesh(geo, list[0].material); merged.castShadow = list[0].castShadow; merged.receiveShadow = list[0].receiveShadow;
      for (const m of list) m.removeFromParent(); root.add(merged); geometries.forEach(g => g.dispose());
    }
  }
  function at(s, offset = 0) {
    const p = track.sample(s, offset), group = new THREE.Group(); group.position.set(p.x, p.y, p.z); group.rotation.y = p.yaw; scene.add(group); return group;
  }
  function strip(offsetA, offsetB, heightA, heightB, color, from = 0, to = 1) {
    const v = [], idx = [], colors = []; const n = Math.ceil((to - from) * 800);
    const base = new THREE.Color(color);
    for (let i = 0; i <= n; i++) {
      const s = (from + (to - from) * i / n) * track.length;
      for (const [offset, h] of [[offsetA, heightA], [offsetB, heightB]]) {
        const p = track.sample(s, offset); v.push(p.x, p.y + h, p.z);
        const shade = 1 + Math.sin(i * 1.74) * .025; colors.push(base.r * shade, base.g * shade, base.b * shade);
      }
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m); return m;
  }
  // The coast is a true world-space loop. The bridge deliberately leaves open water underneath.
  for (const [from, to] of [[0, .43], [.63, 1]]) {
    strip(-38, 38, -1, -1, '#efcd8d', from, to);
    strip(-27, -10.2, -.3, -.1, '#9ab76a', from, to); strip(10.2, 28, -.1, -.3, '#9ab76a', from, to);
    strip(-38, -44, -1, -5.5, '#ca9a6d', from, to); strip(38, 44, -1, -5.5, '#ca9a6d', from, to);
    strip(-44, -49, -5.5, -5.9, '#fae2ab', from, to); strip(44, 49, -5.5, -5.9, '#fae2ab', from, to);
  }
  strip(-9, 9, 0, 0, '#efdaa6');
  strip(-9.6, -9, .12, .12, '#f8f3d9'); strip(9, 9.6, .12, .12, '#f8f3d9');
  for (let s = 0; s < track.length; s += 5) {
    const p = track.sample(s);
    if (p.t > .43 && p.t < .63) {
      const plank = at(s); box('#ba9469', [0, .04, 0], [18.4, .23, 4.75], plank);
      for (const side of [-1, 1]) {
        box('#b28b60', [side * 9.8, -.8, 0], [.48, 9, .48], plank);
        box('#f3d6a0', [side * 9.8, 1.5, 0], [.24, .22, 5.5], plank);
        box('#f3d6a0', [side * 9.8, .75, 0], [.16, .14, 5.5], plank);
        box('#238f91', [side * 9.8, 1.77, 0], [.62, .18, .62], plank);
      }
      for(const x of [-6,-2,2,6])box('#a28658',[x,.165,0],[.045,.015,4.7],plank);
    } else {
      for (const side of [-1, 1]) {
        const edge = at(s, side * 9.35); box(Math.floor(s / 5) % 2 ? '#de9b77' : '#fff2d1', [0, .13, 0], [.65, .14, 4.95], edge);
      }
    }
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: '#48b9c4', roughness: .48, metalness: .12 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -3.2; scene.add(water);
  let seed = 931; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  // Gentle, non-flashing foam lines, islands and sails give the open sea a horizon.
  const foamMat = new THREE.MeshBasicMaterial({ color: '#bce9df', transparent: true, opacity: .42 });
  for (let i = 0; i < 150; i++) {
    const x = (rand() - .5) * 1200, z = (rand() - .5) * 1000;
    const f = box(foamMat, [x, -3.12, z], [4 + rand() * 15, .02, .13]); f.castShadow = false;
  }
  function palm(s, offset, height) {
    const g = at(s, offset); g.rotation.y += rand() * TAU;
    const name=rand()>.35?'tree_palmDetailedTall':'tree_palmBend';
    model(name,g,height/models[name].size[1]);
  }
  for (let s = 20; s < track.length; s += 17) {
    const t = track.sample(s).t;
    if (t > .43 && t < .63) continue;
    const side = rand() > .5 ? -1 : 1;
    palm(s, side * (14 + rand() * 12), 8 + rand() * 6);
    if (rand() > .48) palm(s + 6, -side * (17 + rand() * 10), 9 + rand() * 4);
    for (let j = 0; j < 3; j++) {
      const g = at(s + j * 3, side * (11 + rand() * 6));
      model(j===2?'rock_smallC':'plant_bushDetailed',g,j===2?6:3.7);
      if (j === 1) { const flower=model('flower_redA',g,4);flower.position.set(.3,.2,.3); }
    }
  }
  const cone = new THREE.ConeGeometry(1, 1, 5);
  function hut(s, offset, color) {
    const g = at(s, offset); g.rotation.y += offset > 0 ? Math.PI / 2 : -Math.PI / 2;
    box(color,[0,2.6,0],[6,4.6,5],g);
    for(const x of [-2.85,2.85])for(const z of [-2.4,2.4])box('#f8f3d9',[x,2.5,z],[.24,5,.24],g);
    for(let y=.8;y<4.6;y+=.55)box('#f8f3d9',[0,y,2.52],[5.7,.045,.025],g);
    box('#238f91',[0,1.8,2.56],[1.3,3,.12],g);
    for (const x of [-1.9,1.9]) {
      box('#f8f3d9',[x,2.9,2.58],[1.6,1.65,.14],g);
      box('#385962',[x,2.9,2.67],[1.25,1.3,.06],g);
      box('#f8f3d9',[x,2.9,2.72],[.09,1.35,.06],g);
      box('#f8f3d9',[x,2.9,2.72],[1.35,.09,.06],g);
    }
    // Two pitched roof planes with repeated raised seams, not a cone on a cube.
    for(const side of [-1,1]) {
      const roof=box('#238f91',[side*1.75,5.7,0],[4.15,.22,6.4],g);roof.rotation.z=-side*.46;
      for(let z=-2.9;z<=3;z+=.65) {const rib=box('#87c3be',[side*1.75,5.86,z],[4.15,.06,.06],g);rib.rotation.z=-side*.46;}
    }
    box('#87c3be',[0,6.55,0],[.22,.16,6.5],g);
    box('#ba9469',[0,.27,3.2],[7,.5,2],g);
    for(const x of [-3,3])box('#f8f3d9',[x,1.15,4],[.2,1.8,.2],g);
    for(const x of [-2.1,2.1])box('#f8f3d9',[x,1.6,4],[1.8,.15,.15],g);
    box('#e9c681',[0,.1,4.45],[2,.2,.6],g);
  }
  for (const s of [45, 80, 120, 310, 370, 760, 860]) hut(s, s % 3 ? 21 : -22, s % 2 ? '#e9b987' : '#b5d2b4');
  for (const s of [200, 250, 290, 780, 820]) {
    const g = at(s, -29); model('rock_largeA',g,12);
    const bush=model('plant_bushDetailed',g,6);bush.position.set(3,.2,0);
  }
  const cloudGeo = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 30; i++) {
    const x = (rand() - .5) * 1300, z = (rand() - .5) * 1300, y = 65 + rand() * 70;
    for (let j = 0; j < 3; j++) { const cloud = mesh(cloudGeo, surface('#f9f9ed','cloud'), [x + j * 8, y + (j === 1 ? 4 : 0), z], [11, 5 + rand() * 3, 7]); cloud.castShadow = false; }
  }
  function sailboat(x, z, scale = 1) {
    const g = new THREE.Group(); g.position.set(x, -2.8, z); g.rotation.y = rand() * TAU; g.scale.setScalar(scale); scene.add(g);
    mesh(smoothBall, surface('#238f91','paint'), [0, 0, 0], [1.5, .8, 4], g);
    box('#fff5d7',[0,.55,0],[2.1,.15,4.8],g);box('#aa9678', [0, 5, 0], [.14, 10, .14], g);
    for(const [side,color] of [[1,'#fff5d7'],[-1,'#e9a38b']]) {
      const vertices=[],indices=[];
      for(let row=0;row<=6;row++) {
        const t=row/6, width=t*3.8;
        vertices.push(.1,9.8-t*8.1,0, .4*Math.sin(t*Math.PI),9.8-t*8.1,side*width);
        if(row<6){const n=row*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
      mesh(geo,new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.9}),[0,0,0],[1,1,1],g);
    }
  }
  [[320, 70], [-340, -100], [100, -290], [380, -190], [-200, 290]].forEach(([x, z]) => sailboat(x, z, 1.5));
  const flagMats = ['#e9a38b', '#87c3be', '#f6d999'];
  const pennant=new THREE.BufferGeometry();pennant.setAttribute('position',new THREE.Float32BufferAttribute([-.6,0,0,.6,0,0,0,-1.25,0],3));pennant.computeVertexNormals();
  for (const s of [5, 260, 700]) {
    const g = at(s);
    for (const side of [-1, 1]) box('#ab9167', [side * 11, 6, 0], [.35, 12, .35], g);
    box('#b7a685', [0, 10.5, 0], [22, .1, .1], g);
    for (let i = 0; i < 12; i++) { const mat=material(flagMats[i%3]);mat.side=THREE.DoubleSide;mesh(pennant,mat,[-10+i*1.8,10.5,0],[1,1,1],g); }
  }
  // Start gantry and chequered line are geometry, so they remain crisp at any screen size.
  const start = at(0);
  for (const side of [-1, 1]) { box('#e8ce98', [side * 10.4, 4.5, 0], [.8, 9, .8], start); box('#238f91', [side * 10.4, .7, 0], [1.2, 1.4, 1.2], start); }
  rounded('#238f91', [0, 8.6, 0], [22, 1.5, .65], start);
  for(const side of [-1,1]) {
    rounded('#f6d999',[side*10.4,4.5,0],[1.1,8.6,.95],start);
    rounded('#238f91',[side*10.4,1,0],[1.5,2,1.4],start);
  }
  for (let x = -9; x < 9; x += 1.5) for (let z = 0; z < 3; z += 1.5) box(((x / 1.5 + z / 1.5) % 2) ? '#fff8dc' : '#385962', [x + .75, .025, z], [1.5, .04, 1.5], start);
  for (let i = 0; i < 10; i++) box(i % 2 ? '#fff7d9' : '#285a62', [-8 + i * 1.8, 8.6, .34], [1, .9, .05], start);
  batchStatic(scene);
  function kart(color, id) {
    const g = new THREE.Group(); scene.add(g);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.65, 20), new THREE.MeshBasicMaterial({ color: '#294b45', transparent: true, opacity: .18, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .07; g.add(shadow);
    const body=model(['kart-oopi','kart-oodi','kart-oobi'][id],g,2.45,true);
    const wheels=[],wheelPivots=[];
    for(const m of [...body.children]) if(m.name.startsWith('wheel-')) {
      m.geometry=m.geometry.clone();m.geometry.computeBoundingBox();
      const center=m.geometry.boundingBox.getCenter(new THREE.Vector3());
      m.geometry.translate(-center.x,-center.y,-center.z);
      const pivot=new THREE.Group();pivot.position.copy(center);pivot.userData.front=m.name.includes('front');
      body.add(pivot);pivot.add(m);wheels.push(m);wheelPivots.push(pivot);
    }
    const flames = [];
    for (const x of [-.55, .55]) { box('#d1d9cc', [x, .55, -1.8], [.35, .35, .45], g); const f = mesh(cone, new THREE.MeshBasicMaterial({ color: '#7dffe6' }), [x, .6, -2.3], [.3, 1.6, .3], g); f.rotation.x = -Math.PI / 2; flames.push(f); }
    const shield = mesh(new THREE.SphereGeometry(2.25, 16, 10), new THREE.MeshBasicMaterial({ color: '#8afbea', transparent: true, opacity: .18, depthWrite: false, wireframe: true }), [0, 1.4, 0], [1, 1, 1], g);
    shield.visible = false; batchStatic(g, new Set([...wheels, ...flames, shield]));
    g.traverse(m => { m.castShadow = false; });
    return { group: g, body, wheels, wheelPivots, flames, shield, previousSpeed:0 };
  }
  const karts = RACERS.map((c, i) => kart(c.color, i));
  const itemMeshes = [];
  const coinGeo = new THREE.CylinderGeometry(.65, .65, .18, 24);
  const coinMat = new THREE.MeshStandardMaterial({ color: '#ffd562', metalness: .5, roughness: .3, emissive: '#9b5f14', emissiveIntensity: .2 });
  const ringGeo = new THREE.TorusGeometry(.46, .045, 5, 16);
  function setPickups(pickups) {
    // Same layout on restart: reuse geometry and avoid allocating another set of GPU buffers.
    if (itemMeshes.length === pickups.length) return;
    for (const m of itemMeshes) scene.remove(m); itemMeshes.length = 0;
    for (const p of pickups) {
      const g = new THREE.Group(), loc = track.sample(p.s, p.offset); g.position.set(loc.x, loc.y + 1.35, loc.z); scene.add(g);
      if (p.type === 'coin') { const c = mesh(coinGeo, coinMat, [0, 0, 0], [1, 1, 1], g); c.rotation.x = Math.PI / 2; mesh(ringGeo, '#fff0af', [0, 0, .105], [1, 1, 1], g); }
      else {
        rounded('#238f91',[0,-.1,0],[1.65,1.3,1.65],g);
        rounded('#f6d999',[0,.61,0],[1.8,.25,1.8],g);
        for(const x of [-.5,.5])box('#f6d999',[x,-.1,0],[.12,1.32,1.68],g);
        rounded('#fff8dc',[0,.03,.86],[.42,.46,.14],g);
        batchStatic(g);
      }
      g.traverse(m => { m.castShadow = false; });
      g.userData.baseY = g.position.y; itemMeshes.push(g);
    }
  }
  const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3(), followTarget = new THREE.Vector3();
  let cameraReady = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const confettiGeo = new THREE.BufferGeometry(), confettiPositions = new Float32Array(240 * 3), confettiColors = new Float32Array(240 * 3);
  for (let i = 0; i < 240; i++) { confettiPositions[i * 3] = (rand() - .5) * 35; confettiPositions[i * 3 + 1] = rand() * 24; confettiPositions[i * 3 + 2] = (rand() - .5) * 35; const c = new THREE.Color(flagMats[i % 3]); confettiColors.set([c.r, c.g, c.b], i * 3); }
  confettiGeo.setAttribute('position', new THREE.BufferAttribute(confettiPositions, 3)); confettiGeo.setAttribute('color', new THREE.BufferAttribute(confettiColors, 3));
  const confetti = new THREE.Points(confettiGeo, new THREE.PointsMaterial({ size: .3, vertexColors: true })); scene.add(confetti); confetti.visible = false;
  function render(race, dt, time, menu = false, alpha = 1) {
    if (!quality.frame()) return;
    confettiGeo.setDrawRange(0, Math.round(240 * quality.state().particles));
    const cars = race.racers.map(c => interpolateCar(c, race.phase === 'racing' ? alpha : 1));
    const player = cars[0], p = track.sample(player.s, player.offset);
    for (const c of cars) {
      const k = karts[c.id], v = track.sample(c.s, c.offset);
      k.group.position.set(v.x, v.y + .12, v.z); k.group.rotation.y = v.yaw - c.heading;
      const next = track.sample(c.s + 1); k.group.rotation.x = -Math.atan2(next.y - v.y, 1);
      const acceleration = (c.speed-k.previousSpeed)/Math.max(dt,.001); k.previousSpeed=c.speed;
      k.group.rotation.x += THREE.MathUtils.clamp(acceleration*.0015,-.025,.025);
      k.group.rotation.z = -c.heading * .18;
      for (const pivot of k.wheelPivots) if (pivot.userData.front) pivot.rotation.y = -c.heading * .65;
      for (const w of k.wheels) w.rotation.x += c.speed * dt * 1.8;
      for (const f of k.flames) { f.visible = c.boost > 0; f.scale.y = 1.4 + Math.sin(time * 45) * .35; }
      k.shield.visible = c.shield > 0; k.shield.rotation.y += dt;
    }
    itemMeshes.forEach((g, i) => {
      const distance = Math.abs(wrap(race.pickups[i].s - player.s + track.length / 2, track.length) - track.length / 2);
      g.visible = race.pickups[i].readyAt <= race.time && (menu || distance < 140);
      if (g.visible) { g.rotation.y = time * 1.3 + i; g.position.y = g.userData.baseY + Math.sin(time * 2.5 + i) * .18; }
    });
    if (menu) {
      const v = track.sample(70), a = -.35 + Math.sin(time * .055) * .12;
      camTarget.set(v.x + 48 * Math.cos(a), v.y + 31, v.z + 57 * Math.sin(a)); lookTarget.set(v.x - 8, v.y + 1, v.z - 10);
    } else if (race.phase === 'finished') {
      camTarget.set(p.x + Math.sin(time * .3) * 10, p.y + 5.5, p.z + Math.cos(time * .3) * 10); lookTarget.set(p.x, p.y + 1.5, p.z);
    } else {
      const ahead = track.sample(player.s + 15, player.offset * .7);
      camTarget.set(p.x - Math.sin(p.yaw) * 11.5, p.y + 5.4, p.z - Math.cos(p.yaw) * 11.5);
      lookTarget.set(ahead.x, ahead.y + 1.1, ahead.z);
    }
    if (!cameraReady) { camera.position.copy(camTarget); followTarget.copy(lookTarget); cameraReady = true; }
    camera.position.lerp(camTarget, 1 - Math.exp(-dt * 6)); followTarget.lerp(lookTarget, 1 - Math.exp(-dt * 8)); camera.lookAt(followTarget);
    // Nearby trailing racers must not fill the mobile camera with a helmet.
    // Fade only their own materials; gameplay, player rendering and other cars remain untouched.
    for(let i=1;i<karts.length;i++) {
      const k=karts[i], distance=camera.position.distanceTo(k.group.position);
      const opacity=menu||race.phase==='finished'?1:THREE.MathUtils.clamp((distance-3)/5,.08,1);
      for(const mat of k.body.userData.fadeMaterials){mat.opacity=opacity;mat.depthWrite=opacity>.99;}
    }
    const fov = (innerWidth < innerHeight ? 68 : 58) + (player.boost > 0 && !reducedMotion.matches ? 5 : 0);
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
    confetti.visible = race.phase === 'finished';
    if (confetti.visible) { confetti.position.set(p.x, p.y, p.z); for (let i = 0; i < 240; i++) confettiPositions[i * 3 + 1] = wrap(confettiPositions[i * 3 + 1] - dt * (2 + i % 3), 24); confettiGeo.attributes.position.needsUpdate = true; }
    renderer.render(scene, camera);
  }
  function resize() { quality.resize(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);
  return { render, setPickups, resetCamera() { cameraReady = false; }, renderer, quality: quality.state,
    modelState:()=>karts.map(k=>({wheels:k.wheels.length,front:k.wheelPivots.filter(p=>p.userData.front).length,turn:k.wheelPivots.find(p=>p.userData.front).rotation.y,spin:k.wheels[0].rotation.x})) };
}
