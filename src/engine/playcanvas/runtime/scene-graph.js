// 引擎层 · 场景图实例化（浏览器运行时片段）。
// 输入是服务端 buildScenePlan() 从 GameProjectV3 算好的 ScenePlan（见 scene-plan.ts）：每个实体带位置 / 尺寸 / 形状 / 颜色 / 贴图 / 行为绑定。
// 这里只负责把它变成 pc.Entity 树；renderer != webgl 的对象已在计划阶段被记入 skipped。

export function createSceneGraph(pc, kits, plan, options) {
  const o = options || {};
  const { geometry, materials, entities, color } = kits;
  const bevel = o.bevel === undefined ? 0.03 : o.bevel;
  const root = new pc.Entity("scene:" + plan.sceneId);
  const byId = new Map();
  const list = [];
  function edgeOf(base) { return color.mixColor(base, o.edgeColor === undefined ? 0xffffff : o.edgeColor, 0.6); }
  function shapeMesh(node) {
    const c = node.color; const s = node.size; const edge = edgeOf(c);
    if (node.shape === "sheet") return geometry.sheetMesh([[-s.x / 2, 0], [s.x / 2, 0], [s.x / 2, s.y], [-s.x / 2, s.y]], Math.max(0.02, s.z), c, edge, 0.02);
    if (node.shape === "cone") return geometry.coneMesh(Math.min(s.x, s.z) / 2, s.y, 6, c, edge);
    if (node.shape === "cylinder") return geometry.cylinderMesh(Math.min(s.x, s.z) / 2, Math.min(s.x, s.z) / 2, s.y, 8, c, edge);
    if (node.shape === "sphere") return geometry.icoMesh(Math.min(s.x, s.y, s.z) / 2, c);
    if (node.shape === "star") return geometry.sheetMesh(geometry.starPoints(Math.min(s.x, s.y) / 2, 0, 5), Math.max(0.02, s.z), c, 0xffffff, 0.02);
    if (node.shape === "plane") return geometry.planeMesh(s.x, s.z, c);
    return geometry.boxMesh(s.x, s.y, s.z, c, edge, bevel, null);
  }
  function shapeOffsetY(node) {
    // 形状在局部坐标里以底面落在 y=0：盒 / 锥 / 柱以中心建模，抬半高；纸片 / 星以底边建模；球抬半径；平面贴地。
    const s = node.size;
    if (node.shape === "sheet") return 0;
    if (node.shape === "star") return s.y / 2;
    if (node.shape === "plane") return 0.001;
    if (node.shape === "sphere") return Math.min(s.x, s.y, s.z) / 2;
    return s.y / 2;
  }
  function materialOf(node) {
    if (node.emissive) return materials.materialFor({ map: null, emissive: node.color, emissiveIntensity: node.emissive });
    if (node.opacity !== undefined && node.opacity < 1) return materials.materialFor({ map: null, opacity: node.opacity, doubleSide: true });
    const wrap = node.textureMode === "wrap" && node.textures[0];
    if (wrap) return materials.materialFor({ map: { texture: wrap.id, tiling: node.textureTiling || 1, url: "./" + wrap.path } });
    return materials.materialFor({ map: null });
  }
  function build(node) {
    const entity = new pc.Entity(node.id);
    const visual = entities.meshEntity(shapeMesh(node), materialOf(node), { cast: node.role !== "background" || node.shape !== "plane", receive: true, name: node.id + ":mesh" });
    visual.setLocalPosition(0, shapeOffsetY(node), 0);
    entity.addChild(visual);
    // 贴纸模式：对象绑定的第一张位图作为贴纸贴在顶面（AI 位图只作贴图，不充当 3D 物体）。
    const sticker = node.textureMode !== "wrap" && node.textures[0];
    if (sticker) {
      const size = Math.min(node.size.x, node.size.z) * 0.8;
      const decal = entities.meshEntity(geometry.planeMesh(size, size, 0xffffff), materials.materialFor({ map: null, decal: sticker.id, decalUrl: "./" + sticker.path }), { cast: false, receive: true, name: node.id + ":sticker" });
      decal.setLocalPosition(0, (node.shape === "plane" ? 0 : node.size.y) + 0.005, 0);
      entity.addChild(decal);
    }
    entity.setLocalPosition(node.position.x, node.position.y, node.position.z);
    if (node.yaw) entity.setLocalEulerAngles(0, node.yaw, 0);
    entity.enabled = node.visible;
    entity.userData = { plan: node, visual, sticker: sticker ? true : false };
    return entity;
  }
  // 先建全部实体，再按 parentId 挂树（子实例位置相对父实体）。
  plan.entities.forEach((node) => { const entity = build(node); byId.set(node.id, entity); list.push({ id: node.id, node, entity }); });
  list.forEach(({ node, entity }) => { const parent = node.parentId ? byId.get(node.parentId) : null; (parent || root).addChild(entity); });
  function dispose() { entities.disposeGroup(root); byId.clear(); list.splice(0); }
  function stats() {
    let triangles = 0;
    root.findComponents("render").forEach((render) => render.meshInstances.forEach((instance) => { const mesh = instance.mesh; const count = mesh && mesh.primitive && mesh.primitive[0] ? mesh.primitive[0].count / 3 : 0; triangles += count; }));
    return { entityCount: list.length, skippedCount: plan.skipped.length, triangles, byRole: list.reduce((acc, item) => { acc[item.node.role] = (acc[item.node.role] || 0) + 1; return acc; }, {}) };
  }
  return { root, byId, list, skipped: plan.skipped, dispose, stats };
}
