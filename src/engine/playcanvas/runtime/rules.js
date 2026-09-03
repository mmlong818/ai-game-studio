// 引擎层 · 规则桥（浏览器运行时片段）：把 GameProjectV3 的 rule（when 条件 / then 动作）接到引擎事件上。
// 条件与动作的语义与 src/shared/rules/index.ts 的 CONDITION_HANDLERS / ACTION_HANDLERS 一致（同一份登记表），
// 只是作用对象换成引擎实体。触发后向 window 派发 "forge:rule"（与 1.1 运行时观测器一致），并通过 events 总线发 "rule".
// 它不替代任何游戏专属规则内核（纸境仍内嵌 paperPopupRulesSource()），只做“事件 → 规则触发 → 反馈”的通用桥。

export function createRuleBridge(project, runtime) {
  // runtime: { events, entities: Map<instanceId, pc.Entity>, sceneGraph, feedback(type, payload), setGameState(state), gameState(), variables }
  const rules = (project.rules || []).filter((rule) => rule.enabled !== false);
  const variables = runtime.variables || Object.fromEntries((project.variables || []).map((variable) => [variable.id, variable.initialValue]));
  const triggered = [];
  const feedback = [];
  const number = (instruction, name, fallback) => { const value = instruction.parameters[name]; return typeof value === "number" && Number.isFinite(value) ? value : (fallback || 0); };
  const refs = (instruction, kinds) => instruction.references.filter((ref) => kinds.includes(ref.kind)).map((ref) => ref.id);
  function targetsOf(instruction) {
    const ids = refs(instruction, ["instance", "object"]);
    const out = [];
    runtime.sceneGraph.list.forEach((item) => { if (ids.includes(item.node.id) || ids.includes(item.node.objectId)) out.push(item); });
    return out;
  }
  const conditions = {
    "state.is": (instruction) => runtime.gameState() === instruction.parameters.value,
    "input.received": (instruction, signal) => signal.type === "input" && (!instruction.parameters.action || signal.action === instruction.parameters.action),
    "collision.overlap": (instruction, signal) => {
      if (signal.type !== "collision") return false;
      const ids = refs(instruction, ["object", "instance"]);
      const involved = [signal.sourceId, signal.targetId, signal.sourceInstanceId, signal.targetInstanceId].filter(Boolean);
      return ids.length < 2 || ids.every((id) => involved.includes(id));
    },
    "timer.elapsed": (instruction, signal) => signal.type === "timer" && signal.id === instruction.parameters.id && signal.elapsedMs >= number(instruction, "minimumMs"),
    "variable.compare": (instruction) => {
      const actual = variables[String(instruction.parameters.id || "")]; const expected = instruction.parameters.value; const operator = instruction.parameters.operator || "equals";
      if (operator === "greater-or-equal") return Number(actual) >= Number(expected);
      if (operator === "less-or-equal") return Number(actual) <= Number(expected);
      return actual === expected;
    },
  };
  const actions = {
    "state.set": (instruction) => { runtime.setGameState(String(instruction.parameters.value)); },
    "variable.set": (instruction) => { variables[String(instruction.parameters.id)] = instruction.parameters.value; },
    "variable.add": (instruction) => { const id = String(instruction.parameters.id); variables[id] = Number(variables[id] || 0) + number(instruction, "value"); },
    "entity.destroy": (instruction) => { targetsOf(instruction).forEach((item) => { item.entity.enabled = false; }); },
    "entity.spawn": (instruction) => { targetsOf(instruction).forEach((item) => { item.entity.enabled = true; item.entity.setLocalPosition(number(instruction, "x"), item.entity.getLocalPosition().y, number(instruction, "y")); }); },
    "movement.apply": (instruction, signal) => {
      if (signal.type !== "input" || !signal.direction) return;
      const distance = number(instruction, "distance", 1);
      targetsOf(instruction).forEach((item) => { const p = item.entity.getLocalPosition(); item.entity.setLocalPosition(p.x + signal.direction.x * distance, p.y, p.z + signal.direction.y * distance); });
    },
    "feedback.emit": (instruction) => { const entry = { type: String(instruction.parameters.type || "generic"), payload: Object.assign({}, instruction.parameters) }; feedback.push(entry); if (feedback.length > 60) feedback.shift(); if (runtime.feedback) runtime.feedback(entry.type, entry.payload); },
  };
  function dispatch(signal) {
    const fired = [];
    for (const rule of rules) {
      const ok = rule.when.every((instruction) => { const handler = conditions[instruction.type]; return handler ? handler(instruction, signal) : false; });
      if (!ok) continue;
      rule.then.forEach((instruction) => { const handler = actions[instruction.type]; if (handler) handler(instruction, signal); });
      fired.push(rule.id); triggered.push(rule.id); if (triggered.length > 200) triggered.shift();
      if (typeof window !== "undefined" && typeof CustomEvent === "function") window.dispatchEvent(new CustomEvent("forge:rule", { detail: { ruleId: rule.id, signal: signal.type } }));
      runtime.events.emit("rule", { ruleId: rule.id, signal });
    }
    return fired;
  }
  // 订阅引擎事件总线：collision / input / timer 直接映射为规则信号。
  const unsubscribe = [
    runtime.events.on("collision", (payload) => dispatch(Object.assign({ type: "collision" }, payload))),
    runtime.events.on("input", (payload) => dispatch(Object.assign({ type: "input" }, payload))),
    runtime.events.on("timer", (payload) => dispatch(Object.assign({ type: "timer" }, payload))),
  ];
  return {
    dispatch, variables, triggered, feedback, ruleCount: rules.length,
    unknownTypes: rules.flatMap((rule) => rule.when.filter((i) => !conditions[i.type]).map((i) => rule.id + ":when:" + i.type).concat(rule.then.filter((i) => !actions[i.type]).map((i) => rule.id + ":then:" + i.type))),
    dispose() { unsubscribe.forEach((off) => off()); },
  };
}
