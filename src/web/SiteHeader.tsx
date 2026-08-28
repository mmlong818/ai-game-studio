import { CircleDot } from "lucide-react";
import { ModelSettingsButton } from "./ModelSettingsButton";
import { PreferenceControls, usePreferences } from "./preferences";

export function SiteHeader({ active }: { active: "studio" | "games" }) {
  const { t } = usePreferences();
  return (
    <>
      <a className="skip-link" href="#main-content">{t("a11y.skip")}</a>
      <header className="app-header">
        <a className="brand" href="/" aria-label={t("brand.home")}>
          <span className="brand-mark" aria-hidden="true">界</span>
          <span className="brand-copy"><strong>{t("brand.name")}</strong><small>GAME CREATION STUDIO</small></span>
        </a>
        <nav className="header-nav" aria-label={t("nav.create")}>
          <a href="/#projects" aria-current={active === "studio" ? "page" : undefined}>{t("nav.create")}</a>
          <a href="/games" aria-current={active === "games" ? "page" : undefined}>{t("nav.games")}</a>
          <span className="environment-badge"><CircleDot size={12} aria-hidden="true" /> {t("nav.local")}</span>
          <ModelSettingsButton />
          <PreferenceControls />
        </nav>
      </header>
    </>
  );
}
