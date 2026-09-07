import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PreferencesProvider } from "./preferences";
import "./styles.css";
import "./workflow.css";
import "./library.css";
import "./design-knowledge.css";
import "../styles/foundation.css";
import "../styles/creator.css";
import "../styles/review.css";
import "../styles/production.css";
import "../styles/responsive.css";
import "../styles/creation-start.css";
import "../styles/creation-workspace.css";
import "../styles/works-space.css";
import "../styles/product-shell.css";
import "../styles/catalog-workspace.css";

const root = document.getElementById("root");
if (!root) throw new Error("页面缺少应用挂载节点。");

createRoot(root).render(
  <StrictMode>
    <PreferencesProvider><App /></PreferencesProvider>
  </StrictMode>,
);
