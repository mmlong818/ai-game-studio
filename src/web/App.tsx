import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import {
  ArrowRight,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  Boxes,
  ChevronRight,
  Gamepad2,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  inferGameTemplate,
  puzzlePieceCounts,
  recommendedAspectRatio,
  visualStyleOptions,
  type GameAspectRatio,
  type GameTemplate,
  type ProjectDetail,
  type ProjectInput,
  type ProjectSummary,
  type PuzzlePieceCount,
  type VisualStyle,
} from "../shared/contracts";
import {
  archiveProject,
  createProject,
  deleteArchivedProject,
  getArchivedProjects,
  getProject,
  getProjects,
  restoreProject,
} from "./api";
import { GameLibrary } from "./GameLibrary";
import { ProjectStudio } from "./ProjectStudio";
import { SiteHeader } from "./SiteHeader";
import { localizedTemplateNames, usePreferences, type ResolvedLocale } from "./preferences";

function projectIdFromLocation() {
  return new URLSearchParams(window.location.search).get("project");
}

function projectIdFromPath() {
  const match = window.location.pathname.match(/^\/projects\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function projectPath(projectId: string) {
  return `/projects/${encodeURIComponent(projectId)}`;
}

function formatDate(value: string, locale: ResolvedLocale) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type TemplateChoice = "auto" | GameTemplate;
type DifficultyChoice = "relaxed" | "standard" | "challenging";
type PuzzlePieceChoice = "auto" | PuzzlePieceCount;
type AspectRatioChoice = "auto" | GameAspectRatio;

const puzzleDifficultyDefaults: Record<DifficultyChoice, PuzzlePieceCount> = {
  relaxed: 9,
  standard: 20,
  challenging: 42,
};

const templateOptions: Array<{
  id: GameTemplate;
  name: string;
  hint: string;
  sample: string;
  source?: string;
}> = [
  { id: "tetris", name: "俄罗斯方块", hint: "堆叠与消行", sample: "做一个构成主义风格的俄罗斯方块，完成 10 条消行获胜，支持键盘和触控。" },
  { id: "puzzle", name: "图片拼图", hint: "上传图片并拖拽拼合", sample: "做一个植物标本室风格的经典拼图，玩家可以上传横图、竖图或方图，拖动拼块完成后播放庆祝声。" },
  { id: "breakout", name: "打砖块", hint: "反弹与连击", sample: "做一个漆艺海面风格的打砖块游戏，击碎全部矿物砖获胜，支持鼠标、键盘和触控。" },
  { id: "klotski", name: "华容道", hint: "移动木块脱困", sample: "做一个东方木艺华容道，移动木块让曹操从底部中央离开，动作要有真实木块声音。" },
  { id: "maze", name: "走迷宫", hint: "每局生成新地图", sample: "做一个苔石庭院迷宫，每局自动生成路线，从左上走到右下的金色灯火。" },
  { id: "snake", name: "贪吃蛇", hint: "收集与成长", sample: "做一个青玉花园贪吃蛇，收集 12 枚朱果获胜，支持键盘和触控。" },
  { id: "merge-2048", name: "数字合成", hint: "滑动、规划与合并", sample: "做一个时尚编辑风格的 2048 数字合成游戏，标准难度目标为 1024，支持滑动、键盘和触控方向键。", source: "2048 · MIT" },
  { id: "space-shooter", name: "太空射击", hint: "规避、火力与波次", sample: "做一个俯视太空射击游戏，飞船自动开火，玩家左右规避敌机并完成目标击破数。", source: "Radius Raid · MIT" },
  { id: "polyomino-fit", name: "多格拼块", hint: "旋转、吸附与填形", sample: "做一个软萌软糖岛屿拼块游戏，旋转并安放不同拼块，完整填满目标轮廓。", source: "mkgame-poly · MIT" },
  { id: "block-place", name: "方块填阵", hint: "三选拼块与横竖消行", sample: "做一个果冻材质的方块填阵游戏，从三块中选择并放进 8×8 棋盘，通过横竖消行达到目标分数。", source: "mkgame-blocks · MIT" },
  { id: "region-logic", name: "区域逻辑", hint: "独占、排除与唯一解", sample: "做一个星灵区域逻辑游戏，每行、每列和每个区域各放一个星灵，并且星灵不能相邻。", source: "mkgame-sudoku · MIT" },
  { id: "mahjong-roguelite", name: "肉鸽麻将", hint: "自由牌配对与航段成长", sample: "做一个软萌月港风格的肉鸽麻将接龙，配对两张自由牌清空层叠牌阵，并在航段之间选择遗物。", source: "Whatajong · MIT" },
];

const translatedSamples: Partial<Record<ResolvedLocale, Partial<Record<GameTemplate, string>>>> = {
  "zh-TW": {
    "space-shooter": "製作一個俯視太空射擊遊戲，飛船自動開火，玩家左右閃避敵機並完成目標擊破數。",
    puzzle: "製作一個植物標本室風格的經典拼圖，玩家可以上傳橫圖、直圖或方圖，拖動拼塊完成後播放慶祝聲。",
    "merge-2048": "製作一個時尚編輯風格的 2048 數字合成遊戲，標準難度目標為 1024，支援滑動、鍵盤和觸控方向鍵。",
  },
  en: {
    "space-shooter": "Create a top-down space shooter with automatic fire, left-right dodging, and a clear enemy defeat target.",
    puzzle: "Create a botanical specimen-room jigsaw puzzle that accepts landscape, portrait, or square images and celebrates when every piece is placed.",
    "merge-2048": "Create a fashion-editorial 2048 game targeting 1024 on standard difficulty, with swipe, keyboard, and touch direction controls.",
  },
  ja: {
    "space-shooter": "自動射撃する宇宙船を左右に動かして敵機を避け、目標数を撃破する見下ろし型シューティングゲーム。",
    puzzle: "横長・縦長・正方形の画像を使える植物標本室風のジグソーパズル。完成時に祝福音を再生する。",
    "merge-2048": "標準難易度の目標を1024にしたファッション誌風の2048。スワイプ、キーボード、タッチ方向キーに対応する。",
  },
};

const aspectRatios: GameAspectRatio[] = ["16:9", "4:3", "1:1", "9:16"];
const ratioSensitiveTemplates = new Set<GameTemplate>(["signal-hunt", "space-shooter", "puzzle"]);

function closestAspectRatio(width: number, height: number): GameAspectRatio {
  const value = width / Math.max(1, height);
  return aspectRatios.reduce((closest, ratio) => {
    const [ratioWidth, ratioHeight] = ratio.split(":").map(Number);
    const [closestWidth, closestHeight] = closest.split(":").map(Number);
    return Math.abs(ratioWidth / ratioHeight - value) < Math.abs(closestWidth / closestHeight - value) ? ratio : closest;
  }, "1:1" as GameAspectRatio);
}

const quickTemplates = ["mahjong-roguelite", "polyomino-fit", "block-place", "region-logic"] as const;

function loadImageFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("图片读取失败，请换一张图片。"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("无法识别这张图片，请使用 JPG、PNG 或 WebP。"));
      image.onload = () => resolve(image);
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function preparePuzzleImage(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10 MB。");
  const image = await loadImageFile(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理这张图片。");
  let maxEdge = 960;
  while (maxEdge >= 320) {
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (let quality = 0.84; quality >= 0.44; quality -= 0.08) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= 210_000) return { dataUrl, aspectRatio: closestAspectRatio(image.naturalWidth, image.naturalHeight) };
    }
    maxEdge = Math.floor(maxEdge * 0.8);
  }
  throw new Error("图片压缩后仍然过大，请换一张细节较少的图片。");
}

function CreatePanel({ onCreated }: { onCreated: (project: ProjectDetail) => void }) {
  const { locale, t } = usePreferences();
  const formRef = useRef<HTMLFormElement>(null);
  const [idea, setIdea] = useState("");
  const [template, setTemplate] = useState<TemplateChoice>("auto");
  const [difficulty, setDifficulty] = useState<DifficultyChoice>("standard");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("fashion");
  const [puzzlePieceCount, setPuzzlePieceCount] = useState<PuzzlePieceChoice>("auto");
  const [dimension, setDimension] = useState<ProjectInput["dimensions"]>("auto");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioChoice>("auto");
  const [customImageDataUrl, setCustomImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resolvedTemplate = template === "auto" ? inferGameTemplate({ idea, template: "auto", dimensions: dimension ?? "auto" }) : template;
  const isPuzzle = resolvedTemplate === "puzzle";
  const recommendedRatio = recommendedAspectRatio(resolvedTemplate, dimension);
  const shouldAskAspectRatio = idea.trim().length > 0 && (dimension === "3d" || ratioSensitiveTemplates.has(resolvedTemplate));

  function chooseTemplate(id: GameTemplate) {
    const option = templateOptions.find((item) => item.id === id);
    if (!option) return;
    setTemplate(option.id);
    setDimension("2d");
    setAspectRatio("auto");
    setIdea(translatedSamples[locale]?.[id] ?? option.sample);
    setError(null);
  }

  function chooseThreeDimension() {
    setTemplate("auto");
    setDimension("3d");
    setAspectRatio("auto");
    setIdea(locale === "en"
      ? "Create a third-person 3D ruin exploration game where the player collects five energy fragments before time runs out, opens the distant exit, and can move with keyboard or touch."
      : locale === "ja"
        ? "制限時間内に5つのエネルギー片を集め、遠くの出口を開いて脱出する三人称3D遺跡探索ゲーム。キーボードとタッチ移動に対応する。"
        : locale === "zh-TW"
          ? "製作一個第三人稱 3D 遺跡探索遊戲，玩家在限時內收集五枚能量碎片，開啟遠端出口並成功撤離，支援鍵盤和觸控移動。"
          : "做一个第三人称 3D 遗迹探索游戏，玩家在限时内收集五枚能量碎片，开启远端出口并成功撤离，支持键盘和触控移动。");
    setError(null);
  }

  async function handleImageChange(file: File | undefined) {
    if (!file) return;
    setImageError(null);
    setIsPreparingImage(true);
    try {
      const prepared = await preparePuzzleImage(file);
      setTemplate("puzzle");
      setDimension("2d");
      setAspectRatio(prepared.aspectRatio);
      setCustomImageDataUrl(prepared.dataUrl);
      setImageName(file.name);
      if (!idea.trim()) setIdea(templateOptions.find((item) => item.id === "puzzle")!.sample);
    } catch (caught) {
      setCustomImageDataUrl(null);
      setImageName(null);
      setImageError(caught instanceof Error ? caught.message : "图片处理失败。");
    } finally {
      setIsPreparingImage(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input: ProjectInput = {
      idea,
      title: String(formData.get("title") ?? "").trim() || undefined,
      dimensions: dimension,
      template,
      difficulty,
      aspectRatio,
      visualStyle,
      puzzlePieceCount: isPuzzle && puzzlePieceCount !== "auto" ? puzzlePieceCount : undefined,
      customImageDataUrl: isPuzzle ? customImageDataUrl ?? undefined : undefined,
    };
    setError(null);
    startTransition(async () => {
      try {
        onCreated(await createProject(input));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "游戏项目创建失败。");
      }
    });
  }

  return (
    <form className="director-panel" ref={formRef} onSubmit={handleSubmit}>
      <header className="director-heading">
        <p className="eyebrow">DIRECT · BUILD · PLAY</p>
        <h2>{t("create.title")}</h2>
        <p>{t("create.detail")}</p>
      </header>

      <div className="prompt-composer">
        <label className="visually-hidden" htmlFor="game-idea">{t("create.ideaLabel")}</label>
        <label className="prompt-upload" htmlFor="puzzle-image" title={t("create.uploadPuzzle")}>
          {isPreparingImage ? <LoaderCircle className="spin" size={20} aria-hidden="true" /> : <ImagePlus size={20} aria-hidden="true" />}
          <span className="visually-hidden">{t("create.uploadPuzzle")}</span>
        </label>
        <input
          className="visually-hidden"
          id="puzzle-image"
          name="puzzle-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isPreparingImage}
          onChange={(event) => void handleImageChange(event.currentTarget.files?.[0])}
        />
        <textarea
          id="game-idea"
          name="idea"
          rows={3}
          required
          minLength={12}
          maxLength={2000}
          autoComplete="off"
          value={idea}
          onChange={(event) => { setIdea(event.currentTarget.value); setError(null); }}
          placeholder={t("create.ideaPlaceholder")}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "create-error" : "creation-note"}
        />
        <button className="director-submit" type="submit" disabled={isPending || idea.trim().length < 12}>
          {isPending ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
          <span>{isPending ? t("create.starting") : t("create.start")}</span>
        </button>
        <div className="prompt-status">
          <span><Sparkles size={14} aria-hidden="true" /> {dimension === "3d" ? `Web ${t("create.explore3d")}` : localizedTemplateNames[locale][resolvedTemplate]}</span>
          <output>{idea.length}/2000</output>
        </div>
      </div>

      {customImageDataUrl ? (
        <div className="inline-upload-preview">
          <img src={customImageDataUrl} alt="已上传的拼图图片" width="96" height="64" />
          <div><strong>{t("create.imageAdded")}</strong><span>{imageName}</span></div>
          <button type="button" onClick={() => { setCustomImageDataUrl(null); setImageName(null); setAspectRatio("auto"); }}>{t("create.remove")}</button>
        </div>
      ) : null}
      {imageError ? <p className="form-error" role="alert">{imageError}</p> : null}

      <div className="quick-start" aria-label={t("create.quick")}>
        <span>{t("create.quick")}</span>
        {quickTemplates.map((id) => <button type="button" onClick={() => chooseTemplate(id)} key={id}>{localizedTemplateNames[locale][id]}</button>)}
        <button type="button" onClick={chooseThreeDimension}><Boxes size={14} aria-hidden="true" /> {t("create.explore3d")}</button>
      </div>

      {shouldAskAspectRatio ? (
        <fieldset className="ratio-question">
          <legend>{t("create.aspectTitle")}</legend>
          <p>{t("create.aspectDetail")}</p>
          <div>
            <label><input type="radio" name="aspect-ratio" value="auto" checked={aspectRatio === "auto"} onChange={() => setAspectRatio("auto")} /><span>{t("create.aspectAuto", { ratio: recommendedRatio })}</span></label>
            {aspectRatios.map((ratio) => (
              <label key={ratio}><input type="radio" name="aspect-ratio" value={ratio} checked={aspectRatio === ratio} onChange={() => setAspectRatio(ratio)} /><span>{ratio === "16:9" ? t("create.aspectLandscape") : ratio === "4:3" ? t("create.aspectClassic") : ratio === "1:1" ? t("create.aspectSquare") : t("create.aspectPortrait")}</span></label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <details className="creation-options">
        <summary><SlidersHorizontal size={16} aria-hidden="true" /> {t("create.settings")} <span>{t("create.settingsHint")}</span></summary>
        <div className="creation-options-body">
          <section className="settings-section">
            <div className="settings-title"><h3>{t("create.templateTitle")}</h3><p>{t("create.templateDetail")}</p></div>
            <div className="compact-template-grid">
              {templateOptions.map((option) => (
                <button
                  className={resolvedTemplate === option.id ? "is-selected" : ""}
                  type="button"
                  aria-pressed={resolvedTemplate === option.id}
                  onClick={() => chooseTemplate(option.id)}
                  key={option.id}
                >
                  <img src={`/media/template-art/${option.id}/cover.png`} alt="" width="160" height="90" loading="lazy" />
                  <span><strong>{localizedTemplateNames[locale][option.id]}</strong><small>{option.hint}</small>{option.source ? <em>{option.source}</em> : null}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-title"><h3>{t("create.visualTitle")}</h3><p>{t("create.visualDetail")}</p></div>
            <div className="compact-style-grid">
              {visualStyleOptions.map((option) => (
                <button
                  className={visualStyle === option.id ? "is-selected" : ""}
                  type="button"
                  aria-pressed={visualStyle === option.id}
                  onClick={() => setVisualStyle(option.id)}
                  key={option.id}
                >
                  <strong>{option.label}</strong><span>{option.detailLabel}</span><small>{option.description}</small>
                </button>
              ))}
            </div>
          </section>

          <div className="option-grid">
            <label>{t("create.name")} <span>{t("create.optional")}</span><input name="title" type="text" maxLength={60} placeholder={t("create.namePlaceholder")} autoComplete="off" /></label>
            <label>{t("create.difficulty")}
              <select name="difficulty" autoComplete="off" value={difficulty} onChange={(event) => setDifficulty(event.currentTarget.value as DifficultyChoice)}>
                <option value="relaxed">{t("create.relaxed")}</option><option value="standard">{t("create.standard")}</option><option value="challenging">{t("create.challenging")}</option>
              </select>
            </label>
            <label>{t("create.dimension")}
              <select name="dimensions" autoComplete="off" value={dimension} onChange={(event) => setDimension(event.currentTarget.value as ProjectInput["dimensions"])}>
                <option value="auto">{t("create.auto")}</option><option value="2d">2D</option><option value="3d">3D</option>
              </select>
            </label>
            {isPuzzle ? (
              <label>{t("create.pieces")}
                <select name="puzzle-piece-count" autoComplete="off" value={puzzlePieceCount} onChange={(event) => setPuzzlePieceCount(event.currentTarget.value === "auto" ? "auto" : Number(event.currentTarget.value) as PuzzlePieceCount)}>
                  <option value="auto">{t("create.piecesByDifficulty", { count: puzzleDifficultyDefaults[difficulty] })}</option>
                  {puzzlePieceCounts.map((count) => <option value={count} key={count}>{t("create.pieceUnit", { count })}</option>)}
                </select>
              </label>
            ) : null}
          </div>
        </div>
      </details>

      {error ? <p className="form-error" id="create-error" role="alert">{error}</p> : null}
      <p className="creation-trust" id="creation-note"><LockKeyhole size={14} aria-hidden="true" /> {t("create.trust")}</p>
    </form>
  );
}

type ProjectListProps = {
  projects: ProjectSummary[];
  archived: boolean;
  busyId: string | null;
  onArchive: (project: ProjectSummary) => void;
  onRestore: (project: ProjectSummary) => void;
  onDelete: (project: ProjectSummary) => void;
};

function ProjectList({ projects, archived, busyId, onArchive, onRestore, onDelete }: ProjectListProps) {
  const { locale, t } = usePreferences();
  if (!projects.length) {
    return <div className="projects-empty"><Gamepad2 size={28} aria-hidden="true" /><strong>{archived ? t("projects.archiveEmpty") : t("projects.none")}</strong><p>{archived ? t("projects.archiveEmptyDetail") : t("projects.noneDetail")}</p></div>;
  }
  return (
    <div className="project-card-grid">
      {projects.map((project) => {
        const cover = project.coverUrl ?? `/media/template-art/${project.template}/cover.png`;
        return (
          <article className={`project-card ${archived ? "is-archived" : ""}`} key={project.id}>
            <a className="project-card-link" href={projectPath(project.id)}>
              <div className="project-cover">
                <img src={cover} alt={t("projects.coverAlt", { title: project.title })} width="640" height="360" loading="lazy" />
                <span className={`status-pill status-${project.status}`}>{archived ? t("projects.archived") : project.status === "published" ? t("projects.published") : project.status === "playable" ? t("projects.playable") : t("projects.contractReady")}</span>
              </div>
              <div className="project-card-body">
                <div><h3>{project.title}</h3><span>{project.dimensions.toUpperCase()} · v{project.version.number}</span></div>
                <p>{project.idea}</p>
                <footer><time>{formatDate(project.archivedAt ?? project.createdAt, locale)}</time><span>{archived ? t("projects.view") : t("projects.continue")} <ChevronRight size={15} aria-hidden="true" /></span></footer>
              </div>
            </a>
            <div className="project-card-actions">
              {archived ? (
                <>
                  <button type="button" onClick={() => onRestore(project)} disabled={busyId === project.id}><ArchiveRestore size={15} aria-hidden="true" />{t("projects.restore")}</button>
                  <button className="project-delete-button" type="button" onClick={() => onDelete(project)} disabled={busyId === project.id}><Trash2 size={15} aria-hidden="true" />{t("projects.delete")}</button>
                </>
              ) : (
                <button type="button" onClick={() => onArchive(project)} disabled={busyId === project.id}><Archive size={15} aria-hidden="true" />{t("projects.archive")}</button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DeleteProjectDialog({ project, busy, error, onCancel, onConfirm }: {
  project: ProjectSummary | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = usePreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (project && !dialog.open) dialog.showModal();
    if (!project && dialog.open) dialog.close();
  }, [project]);

  return (
    <dialog className="delete-project-dialog" ref={dialogRef} onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={() => { if (!busy) onCancel(); }} aria-labelledby="delete-project-title">
      <header><span><AlertTriangle size={20} aria-hidden="true" /></span><button type="button" onClick={onCancel} disabled={busy} aria-label={t("projects.deleteCancel")}><X size={19} aria-hidden="true" /></button></header>
      <h2 id="delete-project-title">{t("projects.deleteTitle")}</h2>
      <p>{t("projects.deleteDetail", { title: project?.title ?? "" })}</p>
      <div className="delete-project-scope"><strong>{t("projects.deleteScopeTitle")}</strong><span>{t("projects.deleteScope")}</span></div>
      {error ? <p className="delete-project-error" role="alert">{error}</p> : null}
      <footer>
        <button type="button" onClick={onCancel} disabled={busy}>{t("projects.deleteCancel")}</button>
        <button className="confirm-delete-button" type="button" onClick={onConfirm} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}{t("projects.deleteConfirm")}</button>
      </footer>
    </dialog>
  );
}

function ProjectSkeleton() {
  const { t } = usePreferences();
  return (
    <div className="project-skeleton-grid" role="status" aria-label={t("projects.loading")}>
      {Array.from({ length: 4 }, (_, index) => <span aria-hidden="true" key={index} />)}
    </div>
  );
}

function StudioHome() {
  const { t } = usePreferences();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(() => window.location.hash === "#archive");

  useEffect(() => {
    let active = true;
    Promise.all([getProjects(), getArchivedProjects()])
      .then(([projectList, archivedList]) => { if (active) { setProjects(projectList); setArchivedProjects(archivedList); } })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "项目加载失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const updateView = () => setShowArchived(window.location.hash === "#archive");
    window.addEventListener("hashchange", updateView);
    return () => window.removeEventListener("hashchange", updateView);
  }, []);

  function handleCreated(project: ProjectDetail) {
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
    window.location.assign(projectPath(project.id));
  }

  async function handleArchive(project: ProjectSummary) {
    setBusyId(project.id);
    setError(null);
    try {
      const archived = await archiveProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setArchivedProjects((current) => [archived, ...current.filter((item) => item.id !== project.id)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("projects.archiveFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(project: ProjectSummary) {
    setBusyId(project.id);
    setError(null);
    try {
      const restored = await restoreProject(project.id);
      setArchivedProjects((current) => current.filter((item) => item.id !== project.id));
      setProjects((current) => [restored, ...current.filter((item) => item.id !== project.id)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("projects.restoreFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setDeleteError(null);
    try {
      await deleteArchivedProject(deleteTarget.id);
      setArchivedProjects((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : t("projects.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="app-shell studio-home-shell">
      <SiteHeader active="studio" />
      <main className="studio-home-main" id="main-content" tabIndex={-1}>
        <section className="studio-home-heading">
          <div><p className="eyebrow">AI GAME CREATION WORKSPACE</p><h1>{t("home.hero").split("\n").map((line, index) => <span key={line}>{index ? <br /> : null}{line}</span>)}</h1></div>
          <p>{t("home.heroDetail")}</p>
        </section>

        <CreatePanel onCreated={handleCreated} />

        <section className="projects-section" id="projects">
          <header className="projects-heading">
            <div><p className="eyebrow">{t("projects.count", { count: projects.length })}</p><h2>{t("projects.continue")}</h2></div>
            <a href="/games">{t("projects.viewDelivered")} <ArrowRight size={16} aria-hidden="true" /></a>
          </header>
          <nav className="project-view-tabs" aria-label={t("projects.views")}>
            <a href="#projects" aria-current={!showArchived ? "page" : undefined}><span>{t("projects.active")}</span><strong>{projects.length}</strong></a>
            <a href="#archive" aria-current={showArchived ? "page" : undefined}><Archive size={15} aria-hidden="true" /><span>{t("projects.archiveBox")}</span><strong>{archivedProjects.length}</strong></a>
          </nav>
          {error ? <div className="global-error" role="alert">{error}</div> : null}
          {loading ? <ProjectSkeleton /> : <ProjectList projects={showArchived ? archivedProjects : projects} archived={showArchived} busyId={busyId} onArchive={handleArchive} onRestore={handleRestore} onDelete={(project) => { setDeleteError(null); setDeleteTarget(project); }} />}
        </section>
      </main>
      <DeleteProjectDialog project={deleteTarget} busy={Boolean(deleteTarget && busyId === deleteTarget.id)} error={deleteError} onCancel={() => { if (!busyId) setDeleteTarget(null); }} onConfirm={confirmDelete} />
      <footer className="studio-home-footer">
        <span>{t("footer.studio")}</span>
        <span>{t("footer.proof")}</span>
        <small>{t("footer.maintenance")}</small>
      </footer>
    </div>
  );
}

function ProjectPage({ projectId, legacyUrl = false }: { projectId: string; legacyUrl?: boolean }) {
  const { t } = usePreferences();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (legacyUrl) window.history.replaceState({}, "", projectPath(projectId));
    getProject(projectId)
      .then((result) => {
        if (!active) return;
        setProject(result);
        document.title = `${result.title} · 制作台`;
      })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "项目详情加载失败。"); });
    return () => { active = false; document.title = "造界 · AI 游戏工坊"; };
  }, [legacyUrl, projectId]);

  return (
    <div className="app-shell studio-route-shell">
      {project ? <ProjectStudio project={project} onProjectChange={setProject} /> : (
        <main className="project-page-state">
          {error ? <div className="global-error" role="alert">{error}</div> : <div className="loading-state" role="status"><LoaderCircle className="spin" size={20} /> {t("studio.loadingPage")}</div>}
          <a className="secondary-button" href="/#projects">{t("studio.backProjects")}</a>
        </main>
      )}
    </div>
  );
}

function NotFoundPage() {
  const { t } = usePreferences();
  return (
    <div className="app-shell studio-home-shell">
      <SiteHeader active="studio" />
      <main className="not-found-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">404 · ROUTE NOT FOUND</p>
        <h1>{t("notFound.title")}</h1>
        <p>{t("notFound.detail")}</p>
        <div><a className="primary-action-link" href="/">{t("notFound.back")}</a><a className="text-action-link" href="/games">{t("notFound.games")} <ArrowRight size={16} aria-hidden="true" /></a></div>
      </main>
    </div>
  );
}

export function App() {
  if (window.location.pathname === "/games") return <GameLibrary />;
  const pathProjectId = projectIdFromPath();
  if (pathProjectId) return <ProjectPage projectId={pathProjectId} />;
  const legacyProjectId = projectIdFromLocation();
  if (legacyProjectId) return <ProjectPage projectId={legacyProjectId} legacyUrl />;
  if (window.location.pathname === "/" || window.location.pathname === "") return <StudioHome />;
  return <NotFoundPage />;
}
