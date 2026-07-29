import { render } from "preact";
import "./global.css";
import "./components/shared.css";
import { App } from "./app";
import { captureTokenFromUrl } from "./lib/auth";
import { I18nProvider } from "./i18n/i18n";

captureTokenFromUrl();

render(
  <I18nProvider>
    <App />
  </I18nProvider>,
  document.getElementById("app")!,
);
