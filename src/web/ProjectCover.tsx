import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { usePreferences } from "./preferences";

export function ProjectCover({ src, alt }: { src: string | null; alt: string }) {
  const { t } = usePreferences();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) return (
    <div className="project-cover-placeholder" role="img" aria-label={t("cover.unavailableLabel", { title: alt })}>
      <Gamepad2 size={36} aria-hidden="true" />
      <span>{t("cover.unavailable")}</span><small>{t("cover.continue")}</small>
    </div>
  );
  return <img src={src} alt={alt} width="640" height="360" loading="lazy" onError={() => setFailedSource(src)} />;
}
