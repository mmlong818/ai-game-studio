export interface AnimationKeyframe {
  at: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface AnimationClip {
  id: string;
  label: string;
  durationMs: number;
  loop: boolean;
  part: string;
  keyframes: AnimationKeyframe[];
}

export function validateAnimationClip(clip: AnimationClip, movableParts: string[]): string[] {
  const errors: string[] = [];
  if (!movableParts.includes(clip.part)) errors.push(`${clip.part} 不是当前对象的可动部件`);
  if (clip.durationMs <= 0) errors.push("动画时长必须大于零");
  if (clip.keyframes.length < 2) errors.push("动画至少需要两个关键帧");
  if (clip.keyframes.some((frame) => frame.at < 0 || frame.at > 1)) errors.push("关键帧位置必须在 0–1 之间");
  if (clip.keyframes.some((frame, index) => index > 0 && frame.at <= clip.keyframes[index - 1].at)) errors.push("关键帧必须按时间递增");
  return errors;
}

export function sampleAnimation(clip: AnimationClip, elapsedMs: number): AnimationKeyframe {
  if (validateAnimationClip(clip, [clip.part]).length > 0) throw new Error("动画片段无效");
  const raw = elapsedMs / clip.durationMs;
  const progress = clip.loop ? ((raw % 1) + 1) % 1 : Math.max(0, Math.min(1, raw));
  const rightIndex = clip.keyframes.findIndex((frame) => frame.at >= progress);
  if (rightIndex <= 0) return clip.keyframes[0];
  const left = clip.keyframes[rightIndex - 1];
  const right = clip.keyframes[rightIndex];
  const ratio = (progress - left.at) / (right.at - left.at);
  const interpolate = (a: number, b: number) => a + (b - a) * ratio;
  return { at: progress, x: interpolate(left.x, right.x), y: interpolate(left.y, right.y), rotation: interpolate(left.rotation, right.rotation), scale: interpolate(left.scale, right.scale) };
}
