import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

// Safety: clear any corrupted localStorage on load errors
try {
  const session = localStorage.getItem('wl_session');
  if (session) {
    const parsed = JSON.parse(session);
    if (!parsed?.user?.id || !parsed?.user?.rol) {
      localStorage.removeItem('wl_session');
    }
  }
} catch {
  localStorage.removeItem('wl_session');
}

import { registerServiceWorker } from "./sw-register";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
