import type { SceneNode } from "./platformTypes";

export interface SceneAdapterSnapshot {
  renderer: SceneNode["renderer"];
  nodeIds: string[];
  drawOrder: string[];
  interactiveNodeIds: string[];
}

const buildSnapshot = (nodes: SceneNode[], renderer: SceneNode["renderer"]): SceneAdapterSnapshot => {
  const eligible = nodes.filter((node) => node.visible && node.renderer === renderer);
  return {
    renderer,
    nodeIds: eligible.map((node) => node.id),
    drawOrder: [...eligible].sort((a, b) => a.layer - b.layer).map((node) => node.id),
    interactiveNodeIds: eligible.filter((node) => node.collider.kind !== "none").map((node) => node.id),
  };
};

export const DOMSceneAdapter = { renderer: "dom" as const, snapshot: (nodes: SceneNode[]) => buildSnapshot(nodes, "dom") };
export const Canvas2DSceneAdapter = { renderer: "canvas-2d" as const, snapshot: (nodes: SceneNode[]) => buildSnapshot(nodes, "canvas-2d") };
export const WebGLSceneAdapter = { renderer: "webgl" as const, snapshot: (nodes: SceneNode[]) => buildSnapshot(nodes, "webgl") };

export function validateSceneAdapterCoverage(nodes: SceneNode[]): string[] {
  const supported = new Set([DOMSceneAdapter.renderer, Canvas2DSceneAdapter.renderer, WebGLSceneAdapter.renderer]);
  return nodes.filter((node) => !supported.has(node.renderer)).map((node) => `${node.label} 没有可用场景适配器`);
}
