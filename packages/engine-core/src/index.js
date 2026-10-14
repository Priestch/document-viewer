// @document-kits/engine-core — public surface.
//
// Zero dependencies, pure source ESM, no build step. Engines live in their
// own packages and register here (see src/factory.js).

export { EngineError, UnsupportedFormatError } from "./errors.js";
export { coerceLocation } from "./location.js";
export { validateCapabilities } from "./capabilities.js";
export { ENGINE_METHODS, assertEngineShape } from "./engine.js";
export {
  registerEngine,
  hasEngine,
  registeredFormats,
  openDocument,
  clearEngines,
} from "./factory.js";
