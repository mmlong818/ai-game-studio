import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PreferencesProvider } from "./preferences";
import "./styles.css";
import "./workflow.css";
import "./library.css";

const root = document.getElementById("root");
if (!root) throw new Error("页面缺少应用挂载节点。");

createRoot(root).render(
  <StrictMode>
    <PreferencesProvider><App /></PreferencesProvider>
  </StrictMode>,
);
