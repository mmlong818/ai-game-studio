import type { Build } from "../shared/contracts";
import { failureDetailsFrom, failureMessage, type FailureDetail } from "../web/failure";

const stageLabel: Record<FailureDetail["stage"], string> = {
  planning: "修改计划", design: "方案生成", asset: "资源生成", code: "代码制作",
  validation: "规则检查", browser: "浏览器验收", delivery: "交付", cancelled: "已停止", unknown: "制作过程",
};
const categoryLabel: Record<FailureDetail["category"], string> = {
  timeout: "响应超时", network: "连接失败", http: "服务请求失败", authentication: "身份验证失败",
  permission: "权限不足", "rate-limit": "服务限流", "invalid-response": "返回内容无效", "invalid-image": "图片不符合要求",
  validation: "检查未通过", configuration: "配置不完整", cancelled: "用户已停止", unknown: "未分类问题",
};

export function FailureDetails({ error, details, fallback = "本次记录未保存详细原因。", className = "" }: {
  error?: unknown;
  details?: Build["failureDetails"];
  fallback?: string;
  className?: string;
}) {
  const resolved = details ?? failureDetailsFrom(error);
  const message = failureMessage(error, "本次制作未完成。");
  if (!resolved?.length) return <section className={`failure-details ${className}`.trim()} role="alert"><strong>未能完成</strong><p>{message}</p><p className="failure-legacy">{fallback}</p></section>;
  return <section className={`failure-details ${className}`.trim()} role="alert" aria-live="assertive">
    <strong>本次未能完成</strong>
    <div className="failure-detail-list">
      {resolved.map((detail, index) => <article key={`${detail.code}-${detail.resource?.file ?? ""}-${index}`}>
        <header><strong>{stageLabel[detail.stage]} · {categoryLabel[detail.category]}</strong>{detail.retryable ? <span>可手动重试</span> : <span>请先处理后再提交</span>}</header>
        <p>{detail.message}</p>
        {detail.resource ? <p className="failure-object">受影响资源：{detail.resource.label}（{detail.resource.file}）</p> : null}
        {detail.operation ? <p className="failure-object">受影响项目：{detail.operation}</p> : null}
        <p className="failure-next">下一步：{detail.nextStep}</p>
        <small>参考编号：{detail.code}{detail.attempt ? ` · 第 ${detail.attempt} 次尝试` : ""}{detail.httpStatus ? ` · 服务状态 ${detail.httpStatus}` : ""}</small>
      </article>)}
    </div>
  </section>;
}
