import { PDFViewerApplication } from "./app.js";

let activeApp;

function createApp(appOptions) {
  const app = new PDFViewerApplication(appOptions);
  activeApp = app;
  return app;
}

function getActiveApp() {
  return activeApp;
}

export {
  getActiveApp,
  createApp,
}