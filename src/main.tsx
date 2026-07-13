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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
