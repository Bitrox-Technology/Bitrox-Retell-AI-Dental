import React from "react";
import { createRoot } from "react-dom/client"; // Named import
import "./index.css";
import App from "./App";

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement); // Use the named import here
  root.render(<App />);
} else {
  console.error("Root element not found");
}
