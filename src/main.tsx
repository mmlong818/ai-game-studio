if (window.location.pathname === "/player-first") {
  const [{ StrictMode }, { createRoot }, { default: PlayerFirstApp }, { PreferencesProvider }, { isSupportedGameLocale }] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("./App"),
    import("./web/preferences"),
    import("./web/game-locale"),
    import("./styles.css"),
  ]);
  const requestedLocale = new URLSearchParams(window.location.search).get("lang");
  if (isSupportedGameLocale(requestedLocale)) {
    try { window.localStorage.setItem("forge-locale", requestedLocale); } catch { /* Keep the current session locale when storage is unavailable. */ }
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <PreferencesProvider><PlayerFirstApp /></PreferencesProvider>
    </StrictMode>,
  );
} else {
  await import("./web/main");
}
