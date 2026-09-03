if (window.location.pathname === "/player-first") {
  const [{ StrictMode }, { createRoot }, { default: PlayerFirstApp }] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("./App"),
    import("./styles.css"),
  ]);
  document.title = "边玩边改 · 造界";
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <PlayerFirstApp />
    </StrictMode>,
  );
} else {
  await import("./web/main");
}
