import { CircleDot, Search } from "lucide-react";
import { ModelSettingsButton } from "./ModelSettingsButton";
import { PreferenceControls, usePreferences } from "./preferences";

type HeaderSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
};

export function SiteHeader({ active, search }: { active: "studio" | "games" | "create"; search?: HeaderSearch }) {
  const { t } = usePreferences();
  return (
    <>
      <a className="skip-link" href="#main-content">{t("a11y.skip")}</a>
      <header className={`app-header ${search ? "has-search" : ""}`}>
        <a className="brand" href="/" aria-label={t("brand.home")}>
          <span className="brand-mark" aria-hidden="true">界</span>
          <span className="brand-copy"><strong>{t("brand.name")}</strong><small>GAME CREATION STUDIO</small></span>
        </a>
        {search ? (
          <div className="header-search" role="search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={search.value}
              onChange={(event) => search.onChange(event.currentTarget.value)}
              placeholder={search.placeholder}
              aria-label={search.label}
              autoComplete="off"
            />
          </div>
        ) : null}
        <nav className="header-nav" aria-label={t("nav.create")}>
          <a href="/" aria-current={active === "games" ? "page" : undefined}>{t("nav.games")}</a>
          <a href="/create" aria-current={active === "create" ? "page" : undefined}>{t("nav.gameCreate")}</a>
          <a href="/projects" aria-current={active === "studio" ? "page" : undefined}>{t("nav.projects")}</a>
          <span className="environment-badge"><CircleDot size={12} aria-hidden="true" /> {t("nav.local")}</span>
          <ModelSettingsButton />
          <PreferenceControls />
        </nav>
      </header>
    </>
  );
}
