/**
 * 纸境 · 立体书迷宫运行时入口（历史文件名）。
 * 渲染层已从 Three.js 迁到 PlayCanvas（见 ./playcanvas-popup-runtime.ts）；这里只做转发，对外导出的函数名与签名保持不变，
 * game-artifact.ts 与测试可以继续从本模块导入 writePaperPopupArtifact / readPaperPopupAssetManifest / paperPopupTextureFiles 等。
 */
export * from "./playcanvas-popup-runtime.js";
