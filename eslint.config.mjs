import js from "@eslint/js";
import globals from "globals";

// No-op stand-ins for upstream pdf.js lint rules referenced by eslint-disable
// comments in upstream-extracted files (keep those comments meaningful).
const upstreamRuleStubs = {
  "no-unsanitized": { rules: { method: { create: () => ({}) } } },
};

export default [
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "packages/document-viewer/pdf.js/", // git submodule, vendored pdf.js — never modify or lint
      "packages/create-viewer/bin", // rollup build output
      "website/.vitepress/cache/", // VitePress dep cache
      "website/.vitepress/dist/", // VitePress build output
      "upstream/", // Rust toolchain
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // CommonJS / Node scripts
    files: ["packages/document-viewer/bin/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },
  {
    // Upstream-derived code: extracted viewer src (SOURCE_CHECK_FILES,
    // delta-checked by pdfjs:upgrade) and the gulpfile template. Uses pdf.js
    // build macros (PDFJSDev) and cross-file script globals; lint is advisory
    // here — edits must stay minimal to keep sync deltas clean.
    files: [
      "packages/document-viewer/src/**/*.{js,mjs}",
      "packages/document-viewer/bin/gulpfile.template.js",
    ],
    plugins: upstreamRuleStubs,
    linterOptions: { reportUnusedDisableDirectives: "off" },
    languageOptions: {
      globals: { PDFJSDev: "readonly" },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-empty": "off",
    },
  },
];
