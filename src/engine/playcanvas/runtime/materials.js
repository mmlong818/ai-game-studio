// 引擎层 · 材质与贴图（浏览器运行时片段）。
// 颜色全部烤进顶点色，因此全场只需少量共享材质（materialFor 缓存）；逐帧改动的材质走 uniqueMaterial（不进缓存，随关卡销毁）。
// options.maps：命名贴图映射 { paper: { texture: "paper-grain.png", tiling: 1.5 } }，让游戏只用名字引用位图；
// options.assetRoot：位图目录（默认 "./assets/"）。

export function createMaterialKit(pc, app, colorKit, options) {
  const o = options || {};
  const assetRoot = o.assetRoot === undefined ? "./assets/" : o.assetRoot;
  const maps = o.maps || {};
  const textureAssets = {};
  function textureAsset(name, url) {
    if (!textureAssets[name]) {
      const asset = new pc.Asset(name, "texture", { url: url || (assetRoot + name) }, { srgb: true, mipmaps: true, anisotropy: 4 });
      asset.ready(() => { const texture = asset.resource; texture.addressU = pc.ADDRESS_REPEAT; texture.addressV = pc.ADDRESS_REPEAT; texture.anisotropy = 4; });
      app.assets.add(asset);
      app.assets.load(asset);
      textureAssets[name] = asset;
    }
    return textureAssets[name];
  }
  function attachTexture(material, name, tiling, asOpacity, url) {
    const asset = textureAsset(name, url);
    const apply = () => { material.diffuseMap = asset.resource; material.diffuseMapTiling.set(tiling, tiling); if (asOpacity) { material.opacityMap = asset.resource; material.opacityMapChannel = "a"; } material.update(); };
    if (asset.resource) apply(); else asset.ready(apply);
    return material;
  }
  const materialCache = new Map();
  const transientMaterials = [];
  function baseMaterial() {
    const material = new pc.StandardMaterial();
    material.diffuse.set(1, 1, 1);
    material.diffuseVertexColor = true;
    material.vertexColorGamma = true;
    material.useMetalness = true;
    material.metalness = 0;
    material.gloss = o.gloss === undefined ? 0.22 : o.gloss;
    return material;
  }
  function applyMap(material, map) {
    if (!map) return;
    const entry = typeof map === "string" ? maps[map] : map;
    if (!entry) return;
    attachTexture(material, entry.texture, entry.tiling === undefined ? 1 : entry.tiling, false, entry.url);
  }
  // key: { map: 名称 | { texture, tiling } | null, emissive: hex | null, emissiveIntensity, opacity, doubleSide, decal }
  function materialFor(options) {
    const key = JSON.stringify(options);
    if (materialCache.has(key)) return materialCache.get(key);
    const material = baseMaterial();
    applyMap(material, options.map);
    // 贴纸：位图 alpha 作透明度，不写深度，叠在纸面之上。
    if (options.decal) { material.diffuseVertexColor = false; attachTexture(material, options.decal, 1, true, options.decalUrl); material.blendType = pc.BLEND_NORMAL; material.depthWrite = false; material.opacity = 1; }
    if (options.emissive) { material.emissive = colorKit.pcColor(options.emissive); material.emissiveIntensity = options.emissiveIntensity || 1; }
    if (options.opacity !== undefined && options.opacity < 1) { material.opacity = options.opacity; material.blendType = pc.BLEND_NORMAL; material.depthWrite = false; }
    if (options.doubleSide) { material.cull = pc.CULLFACE_NONE; material.twoSidedLighting = true; }
    material.update();
    materialCache.set(key, material);
    return material;
  }
  function uniqueMaterial(options) {
    const material = baseMaterial();
    applyMap(material, options.map);
    if (options.tint !== undefined) { material.diffuseVertexColor = false; material.diffuse = colorKit.pcColor(options.tint); }
    if (options.emissive !== undefined) { material.emissive = colorKit.pcColor(options.emissive); material.emissiveIntensity = options.emissiveIntensity || 1; }
    if (options.opacity !== undefined && options.opacity < 1) { material.opacity = options.opacity; material.blendType = pc.BLEND_NORMAL; material.depthWrite = false; }
    if (options.doubleSide) { material.cull = pc.CULLFACE_NONE; material.twoSidedLighting = true; }
    material.update();
    transientMaterials.push(material);
    return material;
  }
  function disposeTransientMaterials() { transientMaterials.splice(0).forEach((material) => material.destroy()); }
  // 发光材质工厂：纯色自发光（灯笼、星、窗）。
  function glowMaterial(color, intensity) { return materialFor({ map: null, emissive: color, emissiveIntensity: intensity === undefined ? 1 : intensity }); }
  // 半透明材质工厂。
  function translucentMaterial(opacity, doubleSide) { return materialFor({ map: null, opacity, doubleSide: Boolean(doubleSide) }); }
  return { textureAssets, textureAsset, attachTexture, materialCache, transientMaterials, baseMaterial, materialFor, uniqueMaterial, disposeTransientMaterials, glowMaterial, translucentMaterial };
}
