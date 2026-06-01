import { render } from "preact";
import "./global.css";
import "./components/shared.css";
import { App } from "./app";
import { captureTokenFromUrl } from "./lib/auth";

captureTokenFromUrl();

render(<App />, document.getElementById("app")!);
