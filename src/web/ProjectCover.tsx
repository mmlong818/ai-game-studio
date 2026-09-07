import { useState } from "react";
import { Gamepad2 } from "lucide-react";

export function ProjectCover({ src, alt }: { src: string | null; alt: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) return (
    <div className="project-cover-placeholder" role="img" aria-label={`${alt}暂不可用`}>
      <Gamepad2 size={36} aria-hidden="true" />
      <span>封面暂不可用</span>
      <small>可继续查看作品</small>
    </div>
  );
  return <img src={src} alt={alt} width="640" height="360" loading="lazy" onError={() => setFailedSource(src)} />;
}
