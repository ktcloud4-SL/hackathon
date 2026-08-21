import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <a
      className="v2-v1-fallback-link"
      href="https://jinwook.store"
      target="_blank"
      rel="noopener noreferrer"
    >
      V1 운영본 열기
    </a>
    <App />
  </StrictMode>,
);
