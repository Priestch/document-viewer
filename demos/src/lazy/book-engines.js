// Lazy book-engines chunk: epub, mobi and cbz live in one package (and share
// the paginator), so one dynamic import covers them all — reflowable and
// stable-pagination formats alike (the chunk began as "reflowable-engines"
// before cbz joined). The book worker itself is a separate chunk that only
// loads on the first open.

import {
  registerCbzEngine,
  registerEpubEngine,
  registerMobiEngine,
} from "@document-kits/epub-engine";

export const register = () => {
  registerEpubEngine();
  registerCbzEngine();
  registerMobiEngine();
};
