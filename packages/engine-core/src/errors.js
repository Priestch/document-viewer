/**
 * Base class for all engine-core errors. Engines are encouraged to subclass
 * this for format-specific failure taxonomy (see the pdf.js exception family
 * for the pattern this mirrors).
 */
export class EngineError extends Error {
  /**
   * @param {string} message
   * @param {{cause?: unknown}} [options]
   */
  constructor(message, options = {}) {
    super(message, options);
    this.name = "EngineError";
  }
}

/**
 * Thrown by `openDocument` when no engine is registered for the requested
 * format, or when the format value is invalid. Content sniffing is NOT
 * performed at this layer (deliberate decision, 2026-10-13): the caller
 * states the format explicitly.
 */
export class UnsupportedFormatError extends EngineError {
  /**
   * @param {string} format
   */
  constructor(format) {
    super(`No engine registered for format "${format}"`);
    this.name = "UnsupportedFormatError";
    this.format = format;
  }
}
