import React from "react";
import ReactDOM from "react-dom/client";
import App from './App';
import './i18n'; // Import i18n config
import "./App.css";

import { isTauri } from "./utils/env";
import { invoke as tauriInvoke } from '@tauri-apps/api/core';
// 启动时显式调用 Rust 命令显示窗口（仅在 Tauri 环境下）
if (isTauri()) {
  tauriInvoke("show_main_window").catch(console.error);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />

  </React.StrictMode>,
);
