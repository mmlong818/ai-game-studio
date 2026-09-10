import { useEffect, useMemo, useRef, useState } from "react";
import { bindAsset, runtimeAssetPaths } from "../domain/assets";
import { auditRuntimeInBrowser } from "../domain/browserAudit";
import { buildOpenSourceBundle } from "../domain/delivery";
import { applyExperienceReview, applyViewportEvidence } from "../domain/experience";
import { runGameplayAcceptance } from "../domain/gameplayAcceptance";
import { generateProjectImage } from "../domain/imageGenerationClient";
import { assetDeliveryForRole } from "../domain/assetDelivery";
import { ImageGenerationQueue } from "../domain/imageQueue";
import type { AssetRole, StudioProject } from "../domain/platformTypes";
import { createHostedPreview, type HostedPreview } from "../domain/previewHosting";
import { publishStableRelease } from "../domain/releaseHosting";
import { createProbe } from "../domain/probe";
import {
  attachBuildResult,
  attachChangeScreenshotEvidence,
  createChangeSet,
  finalizeChangeAndPublish,
  rollbackChange,
} from "../domain/project";
import { loadProject, saveProject } from "../domain/projectStorage";
import { canPublish, createBuild } from "../domain/quality";
import { generateRuntimeFiles } from "../domain/runtimeGenerator";
import { updateSceneNode } from "../domain/scene";

type WorkspaceTab = "scene" | "assets" | "preview" | "quality";
type ManualCheckKey = "gameplayPerspective" | "interfacePerspective" | "understood" | "coreLoop" | "choice" | "feedback" | "fair" | "retry" | "desktop" | "mobile";

const MANUAL_CHECKS: Array<[ManualCheckKey, string]> = [
  ["gameplayPerspective", "已从玩法设计视角完成一局"],
  ["interfacePerspective", "已从界面体验视角完成一局"],
  ["understood", "30 秒内理解目标和第一个动作"],
  ["coreLoop", "第一局出现完整核心循环"],
  ["choice", "存在会改变局面的有意义选择"],
  ["feedback", "视觉与声音反馈服务于规则判断"],
  ["fair", "失败公平且原因清楚"],
  ["retry", "失败后愿意立即重试"],
  ["desktop", "桌面端能舒适完成一局"],
  ["mobile", "手机端能舒适完成一局"],
];

const ROLE_LABELS: Record<AssetRole, string> = {
  player: "玩家角色",
  background: "背景",
  obstacle: "危险障碍",
  collectible: "奖励/收集物",
  effect: "反馈特效",
  interface: "界面图形",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "待构建",
  building: "构建中",
  validating: "验证中",
  "manual-review": "需要试玩",
  completed: "已完成",
  failed: "失败",
  "rolled-back": "已回滚",
};

export function ProductionWorkspace({
  initialProject,
  onBack,
}: {
  initialProject: StudioProject;
  onBack: () => void;
}) {
  const [project, setProjectState] = useState(() => loadProject(initialProject.id) ?? initialProject);
  const undoStack = useRef<StudioProject[]>([]);
  const redoStack = useRef<StudioProject[]>([]);
  const imageQueue = useRef(new ImageGenerationQueue<Awaited<ReturnType<typeof generateProjectImage>>>());
  const currentImageJobId = useRef<string | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("scene");
  const [selectedNodeId, setSelectedNodeId] = useState("NODE-PLAYER");
  const [assetPrompt, setAssetPrompt] = useState("Q 版、轮廓清楚、适合手机屏幕的游戏角色");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("规格已经进入制作工作流，请先补齐 AI 位图资源。");
  const [hostedPreview, setHostedPreview] = useState<HostedPreview | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [manualChecks, setManualChecks] = useState<Record<ManualCheckKey, boolean>>(() => Object.fromEntries(MANUAL_CHECKS.map(([key]) => [key, false])) as Record<ManualCheckKey, boolean>);
  const [manualNote, setManualNote] = useState("");
  const selectedNode = project.scene.find((node) => node.id === selectedNodeId) ?? project.scene[1];
  const activeBuild = project.builds.find((build) => build.id === project.activeBuildId) ?? null;
  const latestChange = project.changeSets.at(-1) ?? null;
  const completion = useMemo(() => {
    const total = project.assertions.length;
    const passed = project.assertions.filter((item) => item.status === "passed").length;
    return { total, passed };
  }, [project.assertions]);
  const publication = activeBuild
    ? canPublish(project, activeBuild.id)
    : { allowed: false, reasons: ["还没有健康构建"] };
  const screenshotUrl = (evidenceId: string | undefined): string | null => {
    if (!evidenceId) return null;
    const evidence = project.evidence.find((item) => item.id === evidenceId && item.kind === "screenshot");
    if (!evidence) return null;
    try { return (JSON.parse(evidence.value) as { dataUrl?: string }).dataUrl ?? null; }
    catch { return null; }
  };
  const beforeScreenshot = screenshotUrl(latestChange?.beforeScreenshotEvidenceIds[0]);
  const afterScreenshot = screenshotUrl(latestChange?.afterScreenshotEvidenceIds[0]);

  useEffect(() => {
    saveProject(project);
  }, [project]);

  const commitProject = (next: StudioProject) => {
    undoStack.current = [...undoStack.current, project].slice(-50);
    redoStack.current = [];
    setProjectState(next);
  };

  const undo = () => {
    const previous = undoStack.current.at(-1);
    if (!previous) return;
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current = [project, ...redoStack.current].slice(0, 50);
    setProjectState(previous);
    setMessage("已撤销上一步制作操作；规则证据状态也同步恢复。");
  };

  const redo = () => {
    const next = redoStack.current[0];
    if (!next) return;
    redoStack.current = redoStack.current.slice(1);
    undoStack.current = [...undoStack.current, project].slice(-50);
    setProjectState(next);
    setMessage("已重做上一步制作操作。");
  };

  const updateNode = (field: "x" | "y" | "width" | "height" | "animationSpeed", value: number) => {
    if (!selectedNode || !Number.isFinite(value)) return;
    try {
      const update =
        field === "x" || field === "y"
          ? { position: { ...selectedNode.position, [field]: value } }
          : field === "width" || field === "height"
            ? { size: { ...selectedNode.size, [field]: value } }
            : { animationSpeed: value };
      const scene = updateSceneNode(project.scene, selectedNode.id, update);
      const changed = createChangeSet(project, `调整${selectedNode.label}的${field}`, [selectedNode.id]);
      commitProject({ ...changed, scene });
      setMessage("安全属性已修改；旧构建保持不变，需要重新构建与验证。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "属性修改失败");
    }
  };

  const generateAsset = async () => {
    if (!selectedNode || selectedNode.id === "SCENE-ROOT") return;
    setBusy("asset");
    setMessage("正在通过本机 CLI 生成 AI 位图；密钥不会进入浏览器或项目文件。");
    try {
      const jobId = `${selectedNode.id}-${Date.now()}`;
      currentImageJobId.current = jobId;
      const delivery = assetDeliveryForRole(selectedNode.role);
      const job = imageQueue.current.enqueue(jobId, (signal) => generateProjectImage(
        { role: selectedNode.role, label: selectedNode.label, prompt: assetPrompt, delivery }, project.assets, signal,
      ));
      await imageQueue.current.idle();
      if (job.status === "cancelled") throw new DOMException("生成已取消", "AbortError");
      if (job.status === "failed" || !job.result) throw new Error(job.error || "AI 位图生成失败");
      const generated = job.result;
      const bound = bindAsset(
        [...project.assets, generated.asset],
        project.assetBindings,
        project.scene,
        generated.asset.id,
        selectedNode.id,
      );
      const changed = createChangeSet(
        project,
        `为${selectedNode.label}生成并绑定 AI 位图`,
        [selectedNode.id],
        [generated.asset.id],
      );
      commitProject({ ...changed, ...bound });
      setMessage("AI 位图已进入资源库并绑定场景对象；需要重新构建与验证。");
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "AI 位图生成已取消。" : error instanceof Error ? error.message : "AI 位图生成失败");
    } finally {
      currentImageJobId.current = null;
      setBusy(null);
    }
  };

  const runBuildAndProbe = async () => {
    setBusy("build");
    setMessage("正在生成不可变构建，并执行真实玩法动作探针。");
    try {
      const changeSetId = project.changeSets.at(-1)?.id ?? null;
      const localAssetPaths = runtimeAssetPaths(project);
      const runtime = generateRuntimeFiles(project.spec, localAssetPaths);
      const buildResult = await createBuild(project, runtime["app.js"], changeSetId);
      let next = attachBuildResult(project, changeSetId, buildResult);
      if (buildResult.build.status === "healthy") {
        const gameplay = runGameplayAcceptance(next, buildResult.build, createProbe(project.spec));
        next = {
          ...next,
          assertions: gameplay.assertions,
          evidence: [
            ...next.evidence.filter((item) => gameplay.assertions.every((assertion) => assertion.id !== item.assertionId)),
            ...gameplay.evidence,
          ],
          changeSets: next.changeSets.map((change) =>
            change.id === changeSetId
              ? { ...change, status: gameplay.errors.length === 0 ? "manual-review" : "failed", failureReasons: gameplay.errors }
              : change,
          ),
        };
      }
      commitProject(next);
      setTab("quality");
      setMessage(
        buildResult.build.status === "healthy"
          ? "构建和玩法探针完成；多设备浏览器检查与真人体验仍需完成。"
          : `构建失败：${buildResult.build.errors.join("；")}`,
      );
    } finally {
      setBusy(null);
    }
  };

  const confirmPlaytest = () => {
    if (!activeBuild) return;
    const result = applyExperienceReview(project, activeBuild, {
      reviewerRoles: ["玩法设计", "界面体验"],
      understoodWithin30Seconds: manualChecks.understood,
      coreLoopInFirstSession: manualChecks.coreLoop,
      meaningfulChoice: manualChecks.choice,
      feedbackSupportsRules: manualChecks.feedback,
      failureIsFairAndExplained: manualChecks.fair,
      wantsToRetry: manualChecks.retry,
      desktopComfortable: manualChecks.desktop,
      mobileComfortable: manualChecks.mobile,
      delightSignals: project.spec.intent.designPillars.slice(0, 3),
      note: manualNote.trim(),
    });
    commitProject({
      ...project,
      assertions: result.assertions,
      evidence: [...project.evidence, ...result.evidence],
    });
    setMessage("真人体验结论已绑定当前构建；自动多设备检查仍独立保留状态。");
  };

  const runViewportAudit = async () => {
    if (!activeBuild) return;
    setBusy("viewport");
    setMessage("正在用真实浏览器尺寸执行桌面、手机横屏和手机竖屏检查。");
    try {
      const observations = await auditRuntimeInBrowser(
        runtimePreview,
        project.spec.qualityTargets.requiredViewports,
        Object.values(previewAssetPaths),
      );
      const result = applyViewportEvidence(project, activeBuild, observations);
      const withEvidence = {
        ...project,
        assertions: result.assertions,
        evidence: [...project.evidence, ...result.evidence],
      };
      commitProject(latestChange ? attachChangeScreenshotEvidence(withEvidence, latestChange.id, activeBuild.id) : withEvidence);
      setMessage(result.errors.length === 0 ? "全部参考视口通过当前浏览器检查。" : result.errors.join("；"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "多设备检查失败");
    } finally {
      setBusy(null);
    }
  };

  const previewAssetPaths = runtimeAssetPaths(project, (path) => `/generated/${path.split("/").pop()}`);
  const runtimePreview = generateRuntimeFiles(project.spec, previewAssetPaths);
  const previewDocument = runtimePreview["index.html"]
    .replace("<head>", `<head><base href="${window.location.origin}/">`)
    .replace('<script type="module" src="./app.js"></script>', `<script>${runtimePreview["app.js"]}</script>`)
    .replace('<link rel="stylesheet" href="./styles.css" />', `<style>${runtimePreview["styles.css"]}</style>`);

  const rollbackLatestChange = () => {
    if (!latestChange || latestChange.status === "rolled-back" || latestChange.status === "completed") return;
    commitProject(rollbackChange(project, latestChange.id));
    setMessage("本组场景、资源和证据已恢复到修改前的健康状态。");
  };

  const publishAndExport = async () => {
    if (!activeBuild || !latestChange) return;
    setBusy("export");
    try {
      const published = finalizeChangeAndPublish(project, latestChange.id, activeBuild.id);
      const assetEntries = await Promise.all(
        activeBuild.assetPaths.map(async (path) => {
          const filename = path.split("/").pop();
          const response = await fetch(`/generated/${filename}`, { cache: "no-store" });
          if (!response.ok) throw new Error(`无法读取交付资源：${path}`);
          return [path, new Uint8Array(await response.arrayBuffer())] as const;
        }),
      );
      const bundle = buildOpenSourceBundle(published, activeBuild, Object.fromEntries(assetEntries));
      const stableRelease = await publishStableRelease(published);
      const blob = new Blob([bundle.bytes.slice().buffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = bundle.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      commitProject(published);
      setPublishedUrl(stableRelease.url);
      setMessage("当前不可变构建已切换到稳定网址，并导出完整开源包。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发布导出失败");
    } finally {
      setBusy(null);
    }
  };

  const hostForPhone = async () => {
    setBusy("hosting");
    try {
      const preview = await createHostedPreview(project);
      setHostedPreview(preview);
      setMessage("短期真机预览已创建；手机需要与电脑处于同一局域网。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "真机预览创建失败");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="production-workspace">
      <header className="production-header">
        <div>
          <button type="button" className="text-action" onClick={onBack}>← 返回规格</button>
          <span className="eyebrow">制作工作台</span>
          <h1>{project.name}</h1>
          <p>{project.spec.intent.vision}</p>
        </div>
        <div className="production-summary">
          <span>规格 {project.spec.schemaVersion}</span>
          <strong>{completion.passed}/{completion.total} 项通过</strong>
          <span>{latestChange ? STATUS_LABELS[latestChange.status] : "尚未修改"}</span>
        </div>
      </header>

      <div className="workspace-notice" role="status">{message}</div>
      <div className="history-actions" aria-label="编辑历史">
        <button type="button" className="text-action" disabled={undoStack.current.length === 0} onClick={undo}>撤销</button>
        <button type="button" className="text-action" disabled={redoStack.current.length === 0} onClick={redo}>重做</button>
      </div>
      <nav className="workspace-tabs" aria-label="制作步骤">
        {([
          ["scene", "场景对象"],
          ["assets", "AI 资源"],
          ["preview", "设备预览"],
          ["quality", "质量证据"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "scene" && (
        <div className="production-grid">
          <section className="object-tree" aria-label="场景层级">
            <h2>场景层级</h2>
            {project.scene.filter((node) => node.id !== "SCENE-ROOT").map((node) => (
              <button
                key={node.id}
                type="button"
                className={selectedNodeId === node.id ? "selected" : ""}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <span>{node.label}</span>
                <small>{ROLE_LABELS[node.role]}</small>
              </button>
            ))}
          </section>
          <section className="scene-canvas" aria-label="场景画面">
            {project.scene.filter((node) => node.id !== "SCENE-ROOT").map((node) => (
              <button
                key={node.id}
                type="button"
                aria-label={`选择${node.label}`}
                className={`scene-object role-${node.role} ${selectedNodeId === node.id ? "selected" : ""}`}
                style={{
                  left: `${node.position.x}%`, top: `${node.position.y}%`,
                  width: `${node.size.width}%`, height: `${node.size.height}%`,
                  zIndex: node.layer,
                  backgroundImage: node.assetId ? `url(/generated/${project.assets.find((asset) => asset.id === node.assetId)?.localPath.split("/").pop()})` : undefined,
                }}
                onClick={() => setSelectedNodeId(node.id)}
              ><span>{node.assetId ? "" : node.label}</span></button>
            ))}
          </section>
          {selectedNode && (
            <section className="property-panel" aria-label="对象属性">
              <h2>{selectedNode.label}</h2>
              <p>{ROLE_LABELS[selectedNode.role]} · {selectedNode.renderer}</p>
              <div className="property-fields">
                <label>X 位置<input type="number" value={selectedNode.position.x} onChange={(event) => updateNode("x", Number(event.target.value))} /></label>
                <label>Y 位置<input type="number" value={selectedNode.position.y} onChange={(event) => updateNode("y", Number(event.target.value))} /></label>
                <label>宽度<input type="number" min="1" value={selectedNode.size.width} onChange={(event) => updateNode("width", Number(event.target.value))} /></label>
                <label>高度<input type="number" min="1" value={selectedNode.size.height} onChange={(event) => updateNode("height", Number(event.target.value))} /></label>
                <label>动画速度<input type="number" min="0.1" step="0.1" value={selectedNode.animation.speed} onChange={(event) => updateNode("animationSpeed", Number(event.target.value))} /></label>
              </div>
              {selectedNode.animation.movableParts.length > 0 && (
                <div className="animation-timeline">
                  <strong>部件动画</strong>
                  <span>可动部件：{selectedNode.animation.movableParts.join("、")}</span>
                  <button type="button" className="secondary-action" onClick={() => {
                    const scene = updateSceneNode(project.scene, selectedNode.id, { animationClip: selectedNode.animation.clip ? null : "walk-cycle" });
                    const changed = createChangeSet(project, `${selectedNode.animation.clip ? "停用" : "启用"}${selectedNode.label}部件动画`, [selectedNode.id]);
                    commitProject({ ...changed, scene });
                  }}>{selectedNode.animation.clip ? "停用循环动画" : "启用循环动画"}</button>
                </div>
              )}
              <div className="locked-properties"><strong>规则锁定</strong><span>碰撞区域、玩法规则、资源角色</span></div>
            </section>
          )}
        </div>
      )}

      {tab === "assets" && selectedNode && (
        <div className="asset-workspace">
          <section>
            <span className="eyebrow">当前对象</span>
            <h2>{selectedNode.label}</h2>
            <p>生成结果会直接进入项目资源库并绑定到此对象，旧版本保留用于回滚。</p>
            <label className="prompt-field">AI 位图要求<textarea value={assetPrompt} onChange={(event) => setAssetPrompt(event.target.value)} /></label>
            <button type="button" className="primary-action" disabled={busy !== null || selectedNode.id === "SCENE-ROOT"} onClick={generateAsset}>
              {busy === "asset" ? "正在生成…" : "生成并绑定 AI 位图"}
            </button>
            {busy === "asset" && <button type="button" className="secondary-action" onClick={() => currentImageJobId.current && imageQueue.current.cancel(currentImageJobId.current)}>取消本次生成</button>}
            <p className="action-footnote">使用服务端/本机 CLI 密钥；浏览器不会接触密钥。只接受 PNG、JPEG、WebP。</p>
          </section>
          <section className="asset-history">
            <h2>资源版本</h2>
            {project.assets.length === 0 ? <p>尚未生成资源。</p> : project.assets.map((asset) => (
              <article key={asset.id}>
                <strong>{asset.label} · v{asset.version}</strong>
                <span>{asset.status} · {asset.model}</span>
                <small>{asset.localPath}</small>
              </article>
            ))}
          </section>
        </div>
      )}

      {tab === "preview" && (
        <div className="preview-workspace">
          <section>
            <h2>桌面预览</h2>
            <iframe title="桌面游戏预览" srcDoc={previewDocument} className="desktop-preview" />
          </section>
          <section>
            <h2>390 × 844 手机预览</h2>
            <iframe title="手机游戏预览" srcDoc={previewDocument} className="mobile-preview" />
            <button type="button" className="secondary-action" disabled={!activeBuild || busy !== null} onClick={hostForPhone}>{busy === "hosting" ? "正在创建…" : "创建 30 分钟真机预览"}</button>
            {hostedPreview && (
              <div className="phone-preview-link">
                <img src={hostedPreview.qrDataUrl} alt="真机预览二维码" width="180" height="180" />
                <a href={hostedPreview.url} target="_blank" rel="noreferrer">{hostedPreview.url}</a>
                <small>有效至 {new Date(hostedPreview.expiresAt).toLocaleTimeString()}</small>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "quality" && (
        <div className="quality-workspace">
          <section>
            <div className="section-heading"><div><span className="eyebrow">当前证据</span><h2>规则与发布门禁</h2></div><button type="button" className="primary-action" disabled={busy !== null} onClick={runBuildAndProbe}>{busy === "build" ? "正在验证…" : "构建并运行玩法探针"}</button></div>
            <div className="assertion-list">
              {project.assertions.map((assertion) => (
                <article key={assertion.id} className={`assertion status-${assertion.status}`}>
                  <span>{assertion.status}</span><div><strong>{assertion.label}</strong><p>{assertion.message}</p></div>
                </article>
              ))}
            </div>
          </section>
          <aside>
            {(beforeScreenshot || afterScreenshot) && (
              <div className="visual-comparison">
                <h2>修改前后画面</h2>
                <div>
                  {beforeScreenshot && <figure><img src={beforeScreenshot} alt="修改前预览截图" /><figcaption>修改前</figcaption></figure>}
                  {afterScreenshot && <figure><img src={afterScreenshot} alt="修改后预览截图" /><figcaption>修改后</figcaption></figure>}
                </div>
              </div>
            )}
            <h2>构建记录</h2>
            {project.builds.length === 0 ? <p>尚未产生构建。</p> : [...project.builds].reverse().map((build) => (
              <article key={build.id} className="build-record"><strong>{build.id}</strong><span>{build.status}</span><small>{build.errors.join("；") || `${build.assetPaths.length} 个本地资源`}</small></article>
            ))}
            <button type="button" className="secondary-action" disabled={!activeBuild || busy !== null} onClick={runViewportAudit}>{busy === "viewport" ? "检查中…" : "运行多设备浏览器检查"}</button>
            <details className="manual-review-form">
              <summary>真人试玩复核</summary>
              {MANUAL_CHECKS.map(([key, label]) => (
                <label key={key}><input type="checkbox" checked={manualChecks[key]} onChange={(event) => setManualChecks((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>
              ))}
              <label>具体观察<textarea value={manualNote} onChange={(event) => setManualNote(event.target.value)} placeholder="记录最明显的爽点、疑问或失败原因" /></label>
              <button type="button" className="secondary-action" disabled={!activeBuild || !Object.values(manualChecks).every(Boolean) || manualNote.trim().length < 8} onClick={confirmPlaytest}>记录双视角试玩通过</button>
            </details>
            <button type="button" className="secondary-action" disabled={!latestChange || latestChange.status === "completed" || latestChange.status === "rolled-back"} onClick={rollbackLatestChange}>整组回滚本次修改</button>
            <button type="button" className="primary-action" disabled={!publication.allowed || busy !== null} onClick={publishAndExport}>{busy === "export" ? "正在导出…" : "发布并导出开源包"}</button>
            {!publication.allowed && <p className="action-footnote">{publication.reasons[0]}</p>}
            {publishedUrl && <a href={publishedUrl} target="_blank" rel="noreferrer">打开稳定玩家网址</a>}
          </aside>
        </div>
      )}
    </main>
  );
}
