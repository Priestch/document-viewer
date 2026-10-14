// openDocument factory + engine registry.
//
// Dependency inversion: engine-core knows nothing about engines. Format
// owners (packages/document-viewer for "pdf", packages/epub-engine for
// "epub") register themselves, and format dispatch happens ONLY here —
// which is what keeps UI code free of format conditionals (red line 2).
// Sniffing is deliberately absent (decision 2026-10-13): the caller states
// the format explicitly; a sniffing layer can be added later as a
// source-classifier in front of this factory.

import { UnsupportedFormatError } from "./errors.js";

/**
 * @typedef {import("./engine.js").DocumentEngine} DocumentEngine
 * @typedef {import("./engine.js").DocumentSource} DocumentSource
 */

/**
 * @typedef {(source: DocumentSource) => DocumentEngine} EngineFactory
 */

// The registry MUST live on globalThis: engine-providing packages (viewer,
// epub-engine) each bundle their own copy of engine-core, and every copy has
// to see one shared registry or `registerEngine` in one bundle would be
// invisible to `openDocument` in another.
const REGISTRY_KEY = "@document-kits/engine-core:registry";

/** @type {Map<string, EngineFactory>} */
const registry = (globalThis[REGISTRY_KEY] ??= new Map());

/**
 * Register an engine factory for a format id. Registering an existing id
 * replaces the previous factory (last registration wins — useful for tests
 * and overrides).
 *
 * @param {string} format
 * @param {EngineFactory} create
 * @returns {void}
 */
export function registerEngine(format, create) {
  if (typeof format !== "string" || !format) {
    throw new TypeError("registerEngine: format must be a non-empty string");
  }
  if (typeof create !== "function") {
    throw new TypeError("registerEngine: create must be a function");
  }
  registry.set(format, create);
}

/**
 * Whether an engine is registered for a format.
 *
 * @param {string} format
 * @returns {boolean}
 */
export function hasEngine(format) {
  return registry.has(format);
}

/** Registered format ids (for diagnostics/tooling — hosts should not branch on it). */
export function registeredFormats() {
  return [...registry.keys()];
}

/**
 * Open a document with the engine registered for `format`. The engine is
 * created and `open(source)` is awaited; a live engine is returned.
 *
 * @param {DocumentSource} source
 * @param {{format: string}} options The caller states the format explicitly.
 * @returns {Promise<DocumentEngine>}
 * @throws {UnsupportedFormatError} when no engine is registered.
 */
export async function openDocument(source, { format }) {
  const create = registry.get(format);
  if (!create) {
    throw new UnsupportedFormatError(format);
  }
  const engine = create(source);
  await engine.open(source);
  return engine;
}

/** Test/teardown helper: forget all registrations. */
export function clearEngines() {
  registry.clear();
}
