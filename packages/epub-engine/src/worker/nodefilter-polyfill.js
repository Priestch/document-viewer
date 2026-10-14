// Window-only globals foliate touches at module-eval time, polyfilled for
// the book worker. Import this module BEFORE any foliate import (sibling
// imports evaluate in order).
//
// - NodeFilter: text-walker.js:17 reads SHOW_* at eval; epubcfi.js:197
//   reads FILTER_* at call time. Values are the stable DOM constants.
// - HTMLElement / customElements: view.js:609 registers <foliate-view> at
//   module eval. The element is never instantiated in the worker (the view
//   layer stays on the main thread), so an inert base class + a no-op
//   registry suffice.

if (typeof globalThis.HTMLElement === "undefined") {
  globalThis.HTMLElement = class HTMLElement {};
}
if (typeof globalThis.customElements === "undefined") {
  globalThis.customElements = /** @type {CustomElementRegistry} */ ({
    define() {},
    get() {
      return undefined;
    },
  });
}

if (typeof globalThis.NodeFilter === "undefined") {
  globalThis.NodeFilter = /** @type {typeof NodeFilter} */ ({
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2,
    FILTER_SKIP: 3,
    SHOW_ALL: 0xffffffff,
    SHOW_ELEMENT: 0x1,
    SHOW_ATTRIBUTE: 0x2,
    SHOW_TEXT: 0x4,
    SHOW_CDATA_SECTION: 0x8,
    SHOW_ENTITY_REFERENCE: 0x10,
    SHOW_ENTITY: 0x20,
    SHOW_PROCESSING_INSTRUCTION: 0x40,
    SHOW_COMMENT: 0x80,
    SHOW_DOCUMENT: 0x100,
    SHOW_DOCUMENT_TYPE: 0x200,
    SHOW_DOCUMENT_FRAGMENT: 0x400,
    SHOW_NOTATION: 0x800,
  });
}
