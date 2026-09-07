// Display completed string values from the partial JSON, not raw protocol fields.
const labels: Record<string, string> = { genre: "游戏类型", target_player: "适合谁玩", player_fantasy: "玩家体验", session_length: "每局时长", core_loop: "具体怎么玩", win_condition: "胜利条件", fail_condition: "失败条件", progression: "关卡成长", difficulty_curve: "难度递进", game_feel: "操作反馈", onboarding: "新手帮助", accessibility: "易用性", extra_production_risks: "需验证的内容" };
export function streamingDesignText(raw: string) {
  const parts: string[] = [];
  for (const match of raw.matchAll(/"(?:\\.|[^"\\])*"/g)) {
    const value: string = JSON.parse(match[0]);
    const tail = raw.slice(match.index! + match[0].length).trimStart();
    if (tail.startsWith(":")) {
      if (labels[value]) parts.push("\n" + labels[value]);
    } else parts.push(value);
  }
  return parts.join("\n").trim();
}
