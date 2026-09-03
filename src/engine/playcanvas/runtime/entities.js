// 引擎层 · 实体工具（浏览器运行时片段）：网格实体、摆放、销毁、测量、确定性随机。

export function createEntityKit(pc, colorKit) {
  function group(name) { return new pc.Entity(name); }
  function meshEntity(mesh, material, options) {
    const entity = new pc.Entity(options && options.name);
    entity.addComponent("render", { meshInstances: [new pc.MeshInstance(mesh, material)], castShadows: !options || options.cast !== false, receiveShadows: !options || options.receive !== false });
    return entity;
  }
  function setPos(entity, x, y, z) { entity.setLocalPosition(x, y, z); return entity; }
  // 弧度制欧拉角。
  function setRot(entity, rx, ry, rz) { entity.setLocalEulerAngles(colorKit.deg(rx || 0), colorKit.deg(ry || 0), colorKit.deg(rz || 0)); return entity; }
  function setScale(entity, s) { entity.setLocalScale(s, s, s); return entity; }
  function place(entity, position) { entity.setLocalPosition(position.x, position.y, position.z); return entity; }
  function disposeGroup(entity) { while (entity.children.length) entity.children[entity.children.length - 1].destroy(); }
  function meshMaterial(entity) { return entity.render.meshInstances[0].material; }
  function tag(entity, data) { entity.userData = Object.assign(entity.userData || {}, data); return entity; }
  function seeded(seed) {
    let value = seed >>> 0;
    return () => { value = (value + 0x6d2b79f5) >>> 0; let t = value; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // 用引擎的网格实例包围盒测量实体（未挂到场景时以自身为根）。
  function measureBounds(item) {
    item.syncHierarchy();
    let minX = Infinity; let minY = Infinity; let minZ = Infinity; let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
    item.findComponents("render").forEach((render) => render.meshInstances.forEach((instance) => {
      const aabb = instance.aabb; const lo = aabb.getMin(); const hi = aabb.getMax();
      minX = Math.min(minX, lo.x); minY = Math.min(minY, lo.y); minZ = Math.min(minZ, lo.z); maxX = Math.max(maxX, hi.x); maxY = Math.max(maxY, hi.y); maxZ = Math.max(maxZ, hi.z);
    }));
    if (!Number.isFinite(minX)) return { height: 0.01, radius: 0.01, min: null, max: null };
    return { height: maxY - Math.min(0, minY), radius: Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minZ), Math.abs(maxZ)), min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
  }
  // 点光：range / intensity / color；不投影（阴影预算留给主光）。
  function pointLight(name, color, intensity, range) {
    const light = new pc.Entity(name);
    light.addComponent("light", { type: "omni", color: colorKit.pcColor(color), intensity, range, falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED, castShadows: false });
    return light;
  }
  return { group, meshEntity, setPos, setRot, setScale, place, disposeGroup, meshMaterial, tag, seeded, measureBounds, pointLight };
}
