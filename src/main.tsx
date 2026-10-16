import React from "react";
import ReactDOM from "react-dom/client";
import { Hud } from "./components/Hud";
import { SettingsWindow } from "./components/Settings";
import "./styles.css";

const isSettings = window.location.hash.startsWith("#settings");
document.documentElement.dataset.window = isSettings ? "settings" : "hud";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isSettings ? <SettingsWindow /> : <Hud />}</React.StrictMode>,
);
