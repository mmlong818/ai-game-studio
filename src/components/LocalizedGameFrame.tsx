import { useEffect, useRef, useState, type IframeHTMLAttributes } from "react";
import { postGameLocale, withGameLocale } from "../web/game-locale";
import { useComponentLocale } from "./component-i18n";

export function LocalizedGameFrame({ source, onLoad, ...props }: { source: string } & Omit<IframeHTMLAttributes<HTMLIFrameElement>, "src">) {
  const locale = useComponentLocale();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState(() => withGameLocale(source, locale));
  const sourceRef = useRef(source);
  useEffect(() => {
    if (sourceRef.current === source) return;
    sourceRef.current = source;
    setSrc(withGameLocale(source, locale));
  }, [source, locale]);
  useEffect(() => { postGameLocale(frameRef.current, locale); }, [locale]);
  return <iframe {...props} ref={frameRef} src={src} onLoad={(event) => { postGameLocale(frameRef.current, locale); onLoad?.(event); }} />;
}
