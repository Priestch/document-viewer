import { createViewerApp, getViewerConfiguration } from "./app_manager.js";

// Block the "load" event until all pages are loaded, to ensure that printing
// works in Firefox; see https://bugzilla.mozilla.org/show_bug.cgi?id=1618553
document.blockUnblockOnload?.(true);

export { createViewerApp, getViewerConfiguration };
