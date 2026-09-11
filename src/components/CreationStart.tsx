import { useState } from "react";
import { SpriteAnimationChoice, type SpriteAnimationPreference } from "./SpriteAnimationControl";

const ideas = [
  { name: "星光收集", text: "一只小龙在星空花园里自由移动，吃星星会变长，躲开巡逻障碍，操作简单，关卡难度逐步提升。" },
  { name: "午后拼图", text: "一个温暖植物园主题的拖拽拼图游戏，从简单轮廓逐步挑战复杂图案，拼好后有漂亮的庆祝动画。" },
  { name: "三分钟合成", text: "一个单手就能玩的水果合成小游戏，每局三到五分钟，有新手引导、连锁奖励和不限目标的无限玩法。" },
];

export function CreationStart({ value, onChange, onContinue, onRemix, errors, spriteAnimation, onSpriteAnimationChange }: {
  value: string; onChange: (value: string) => void; onContinue: (explicit?: boolean) => void; onRemix: () => void; errors: string[];
  spriteAnimation: SpriteAnimationPreference; onSpriteAnimationChange: (value: SpriteAnimationPreference) => void;
}) {
  const [replacement, setReplacement] = useState<string | null>(null);
  const ready = value.trim().length >= 12;
  function update(text: string) { onChange(text); }
  function useIdea(text: string) {
    if (value.trim() && value !== text) setReplacement(text);
    else update(text);
  }
  return <div className="creation-start">
    <section className="creation-composer" aria-labelledby="creation-brief-label">
      <div className="creation-composer-heading"><span>从一个想法开始</span><span>01 / 描述</span></div>
      <label id="creation-brief-label" htmlFor="creation-brief">你想做一个什么游戏？</label>
      <textarea id="creation-brief" value={value} onChange={event => update(event.target.value)} rows={5}
        aria-describedby="creation-brief-help" placeholder="比如：让一只小龙在花园里吃星星，越吃越长。轻松上手，也能一直玩下去。" />
      <div className="creation-submit-row">
        <p id="creation-brief-help" role="status">{ready ? "确认后会生成方案并使用文字模型额度；确认前不会生成图片或制作游戏。" : "写一句完整的话就好，不需要填写技术参数。确认查看方案时会使用文字模型额度。"}</p>
        <button type="button" className="primary-action" disabled={!ready} onClick={() => onContinue(true)}>提交，生成方案 <span aria-hidden="true">→</span></button>
      </div>
      <div className="creation-inspiration"><span>没想好？试试一个灵感</span>
        {ideas.map(idea => <button type="button" key={idea.name} onClick={() => useIdea(idea.text)}>{idea.name} ↗</button>)}
      </div>
      <SpriteAnimationChoice value={spriteAnimation} onChange={onSpriteAnimationChange} />
      {errors.length > 0 && <p role="alert">{errors.join("；")}</p>}
      {replacement && <div className="creation-replace" role="status"><span>要用这个灵感替换当前描述吗？</span><button type="button" onClick={() => { update(replacement); setReplacement(null); }}>替换描述</button><button type="button" onClick={() => setReplacement(null)}>保留原文</button></div>}
    </section>
    <aside className="creation-companion" aria-label="创作流程">
      <span className="eyebrow">从想法到试玩</span><h2>你定方向，<br />制作交给平台。</h2>
      <ol><li><strong>说说你想玩的</strong><p>主题、玩法或喜欢的感觉，选一个说就行。</p></li><li><strong>确认玩法方案</strong><p>先看玩法如何组合，再决定是否制作。</p></li><li><strong>制作、检查、试玩</strong><p>平台自动制作和检查，完成后即可试玩。</p></li></ol>
      <button type="button" className="creation-remix" onClick={onRemix}><strong>改一个现有游戏 <span aria-hidden="true">→</span></strong><span>保留喜欢的玩法，做出自己的版本。</span></button>
    </aside>
  </div>;
}
