import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import DisableDevtool from "disable-devtool";
import App from "./App.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import "./index.css";

// Prevent DevTools inspection in production only
if (!import.meta.env.DEV) {
  DisableDevtool({
    url: "about:blank",
    disableMenu: true,
    clearLog: true,
    disableSelect: false,
    disableCopy: false,
    interval: 200,
  });
}

// Register PWA Service Worker for offline asset caching
if ("serviceWorker" in navigator) {
  const registerSW = () => {
    navigator.serviceWorker
      .register("/pwa-sw.js")
      .then((reg) => {
        console.log("[PWA] Service Worker registered successfully:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Service Worker registration failed:", err);
      });
  };

  if (document.readyState === "complete") {
    registerSW();
  } else {
    window.addEventListener("load", registerSW);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

