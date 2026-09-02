export interface SpriteFrame {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function splitSpriteSheet(width: number, height: number, columns: number, rows: number): SpriteFrame[] {
  if (![width, height, columns, rows].every(Number.isInteger) || width <= 0 || height <= 0 || columns <= 0 || rows <= 0) {
    throw new Error("精灵图尺寸和行列必须是正整数");
  }
  if (width % columns !== 0 || height % rows !== 0) throw new Error("精灵图不能按指定行列整齐拆分");
  const frameWidth = width / columns;
  const frameHeight = height / rows;
  return Array.from({ length: columns * rows }, (_, index) => ({
    index,
    x: (index % columns) * frameWidth,
    y: Math.floor(index / columns) * frameHeight,
    width: frameWidth,
    height: frameHeight,
  }));
}
