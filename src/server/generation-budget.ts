/** A request allowance, not a currency estimate or provider billing receipt. */
export class GenerationBudget {
  private used = 0;
  constructor(readonly limit = 3) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("生成请求额度必须是正整数。");
  }
  reserve() {
    if (this.used >= this.limit) throw new Error(`本次代码生成已达到 ${this.limit} 次请求上限，已停止自动修复，不会继续消耗模型额度。`);
    return ++this.used;
  }
}

/** Only a completed artifact check can authorize another paid repair attempt. */
export class ArtifactValidationFailure extends Error {}
