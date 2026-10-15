// Minimal Promise statics for pdf.js' MessageHandler, installed only when
// the platform lacks them.
//
// The MessageHandler bundle we import from @document-kits/viewer needs
// `Promise.withResolvers` and `Promise.try`; both ship in the browsers the
// viewer itself targets (its own pdf.worker.mjs has the same requirements),
// but Node < 22 / 24 (epub-engine's unit-test runtime) does not have them.
// Import this module before creating MessageHandler instances.

if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

if (typeof Promise.try !== "function") {
  // Sync throws from the callback must reject (the Promise constructor's
  // executor wraps them), matching the spec proposal's semantics.
  Promise.try = function (callback, ...args) {
    return new Promise((resolve) => resolve(callback(...args)));
  };
}

export {};
