import { Braces, CheckCircle2, Clock3, FileText, FlaskConical, Image as ImageIcon, LoaderCircle, PackageCheck, ScanSearch, XCircle } from "lucide-react";
import type { Build, BuildStep } from "../shared/contracts";
import { LiveExcerpt } from "./WaitingActivity";

/** 制作步骤列表：项目页与制作页共用同一套编号轨道、动作标签与状态图标。 */
export const stepActionLabels: Record<BuildStep["kind"], string> = {
  analyze: "ANALYZE",
  document: "WRITE DOC",
  code: "WRITE CODE",
  asset: "GENERATE ASSET",
  test: "RUN TEST",
  delivery: "PACKAGE",
};

export function StepIcon({ status }: { status: BuildStep["status"] }) {
  if (status === "succeeded") return <CheckCircle2 size={16} aria-hidden="true" />;
  if (status === "running") return <LoaderCircle className="spin" size={16} aria-hidden="true" />;
  if (status === "failed") return <XCircle size={16} aria-hidden="true" />;
  return <Clock3 size={16} aria-hidden="true" />;
}

export function StepKindIcon({ kind }: { kind: BuildStep["kind"] }) {
  if (kind === "analyze") return <ScanSearch size={15} aria-hidden="true" />;
  if (kind === "document") return <FileText size={15} aria-hidden="true" />;
  if (kind === "code") return <Braces size={15} aria-hidden="true" />;
  if (kind === "asset") return <ImageIcon size={15} aria-hidden="true" />;
  if (kind === "test") return <FlaskConical size={15} aria-hidden="true" />;
  return <PackageCheck size={15} aria-hidden="true" />;
}

export function BuildStageList({ steps, evidenceLabel = "步骤结果", showExcerpt = true }: { steps: Build["steps"]; evidenceLabel?: string; showExcerpt?: boolean }) {
  return (
    <ol className="production-stages">
      {steps.map((step, index) => (
        <li className={`production-stage step-${step.status}`} key={step.id}>
          <div className="stage-rail" aria-hidden="true">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i />
          </div>
          <article className="stage-body">
            <header>
              <span className="stage-action"><StepKindIcon kind={step.kind} />{stepActionLabels[step.kind]}</span>
              <span className="stage-status"><StepIcon status={step.status} /></span>
            </header>
            <strong>{step.title}</strong>
            <p>{step.detail}</p>
            {showExcerpt && step.status === "running" && step.excerpt && <LiveExcerpt text={step.excerpt} />}
            {step.output ? (
              <div className="stage-evidence">
                <span>{evidenceLabel}</span>
                <p>{step.output}</p>
              </div>
            ) : null}
          </article>
        </li>
      ))}
    </ol>
  );
}
