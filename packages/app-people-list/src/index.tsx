import { createRoot } from "react-dom/client";
import App from "./components/app";

// Render straight away rather than on DOMContentLoaded: module scripts run after the
// document is parsed, and the federation runtime's top-level await can delay this
// module until after DOMContentLoaded has fired, which left the standalone page blank.
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Root element not found");
}
