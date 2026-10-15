// Lazy EPUB/MOBI chunk: both reflowable engines live in one package (and
// share the paginator), so one dynamic import covers both. The book worker
// itself is a separate chunk that only loads on the first open.

import { registerEpubEngine, registerMobiEngine } from "@document-kits/epub-engine";

export const register = () => {
  registerEpubEngine();
  registerMobiEngine();
};
