import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { App } from "./app/App";
import { installUrlSync } from "./state/urlSync";
import { bootstrapTheme } from "./state/theme";
import { preloadCuratedRepos } from "./core/session/preloader";

bootstrapTheme();
installUrlSync();
preloadCuratedRepos();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
