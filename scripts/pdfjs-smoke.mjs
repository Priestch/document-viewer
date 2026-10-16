#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();

function parseArgs(argv) {
  const options = {
    distDir: "packages/document-viewer/dist/generic",
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--dist-dir":
        options.distDir = argv[++i] ?? options.distDir;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: pnpm pdfjs:smoke [options]

Options:
  --dist-dir <path>   Dist directory to inspect (default: packages/document-viewer/dist/generic)
  --help              Show this help
`);
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function checkFileContains(filePath, needle) {
  const content = fs.readFileSync(filePath, "utf-8");
  return content.includes(needle);
}

function runSmoke(options) {
  const distDir = path.resolve(ROOT_DIR, options.distDir);
  const buildDir = path.join(distDir, "build");
  const webDir = path.join(distDir, "web");

  const checks = [
    {
      name: "dist/generic/build/app.js exists",
      ok: exists(path.join(buildDir, "app.js")),
      detail: path.join(buildDir, "app.js"),
    },
    {
      name: "dist/generic/build/pdf.worker.mjs exists",
      ok: exists(path.join(buildDir, "pdf.worker.mjs")),
      detail: path.join(buildDir, "pdf.worker.mjs"),
    },
    {
      name: "dist/generic/build/pdf.sandbox.mjs exists",
      ok: exists(path.join(buildDir, "pdf.sandbox.mjs")),
      detail: path.join(buildDir, "pdf.sandbox.mjs"),
    },
    {
      name: "dist/generic/web/viewer.mjs exists",
      ok: exists(path.join(webDir, "viewer.mjs")),
      detail: path.join(webDir, "viewer.mjs"),
    },
    {
      name: "dist/generic/web/viewer.html exists",
      ok: exists(path.join(webDir, "viewer.html")),
      detail: path.join(webDir, "viewer.html"),
    },
    {
      name: "dist/generic/web/compressed.tracemonkey-pldi-09.pdf exists",
      ok: exists(path.join(webDir, "compressed.tracemonkey-pldi-09.pdf")),
      detail: path.join(webDir, "compressed.tracemonkey-pldi-09.pdf"),
    },
  ];

  const appBundlePath = path.join(buildDir, "app.js");
  const viewerHtmlPath = path.join(webDir, "viewer.html");
  const viewerCssPath = path.join(webDir, "viewer.css");

  checks.push({
    name: "viewer.css includes the scoped reader shell and responsive layout",
    ok:
      exists(viewerCssPath) &&
      checkFileContains(viewerCssPath, ".reader-shell") &&
      checkFileContains(viewerCssPath, "@container reader"),
    detail: "expected reader_shell.css appended to the native stylesheet",
  });

  if (exists(appBundlePath)) {
    checks.push(
      {
        name: "app.js exports createViewerApp",
        ok: checkFileContains(appBundlePath, "createViewerApp"),
        detail: "expected createViewerApp symbol in app bundle",
      },
      {
        name: "app.js includes reader shell presentation and theme controls",
        ok:
          checkFileContains(appBundlePath, "reader-shell-title") &&
          checkFileContains(appBundlePath, "readerTheme"),
        detail: "expected the decorated template in the viewer bundle",
      },
      {
        name: "app.js contains dynamic _openFileInput usage",
        ok: checkFileContains(appBundlePath, "_openFileInput"),
        detail: "expected dynamic file input handling",
      },
      {
        name: "app.js includes highlight thickness binding",
        ok: checkFileContains(appBundlePath, "editorFreeHighlightThickness"),
        detail: "expected highlight thickness UI binding",
      },
      {
        name: "app.js includes highlight show-all binding",
        ok: checkFileContains(appBundlePath, "editorHighlightShowAll"),
        detail: "expected highlight visibility UI binding",
      },
      {
        name: "app.js does not rely on globalThis.pdfjsLib bridge",
        ok: !checkFileContains(appBundlePath, "globalThis.pdfjsLib"),
        detail: "global bridge is a known runtime regression risk",
      }
    );
  }

  if (exists(viewerHtmlPath)) {
    checks.push(
      {
        name: "viewer.html contains highlight thickness control",
        ok: checkFileContains(viewerHtmlPath, "editorFreeHighlightThickness"),
        detail: "expected highlight thickness control in template",
      },
      {
        name: "viewer.html contains highlight show-all toggle",
        ok: checkFileContains(viewerHtmlPath, "editorHighlightShowAll"),
        detail: "expected highlight visibility toggle in template",
      },
      {
        name: "viewer.html no longer contains static file input",
        ok: !checkFileContains(viewerHtmlPath, 'data-dom-id="fileInput"'),
        detail: "expected dynamic file input only",
      }
    );
  }

  checks.push(...runContractChecks());

  return checks;
}

// Identifiers that bin/gulpfile.template.js relies on from the upstream
// gulpfile scope (textually concatenated into gulpfile.custom.mjs). If
// upstream renames any of these, the build breaks with cryptic errors —
// fail loudly here instead.
const TEMPLATE_UPSTREAM_IDENTIFIERS = [
  "GENERIC_DIR",
  "DEFINES",
  "COMMON_WEB_FILES",
  "AUTOPREFIXER_CONFIG",
  "createWebpackConfig",
  "webpack2Stream",
  "ordered",
  "createBuildNumber",
  "createTemporaryScriptingBundle",
  "createWorkerBundle",
  "createSandboxBundle",
  "createWebBundle",
  "createCMapBundle",
  "createICCBundle",
  "createStandardFontBundle",
  "createWasmBundle",
  "preprocessHTML",
  "preprocessCSS",
  "postcssDirPseudoClass",
  "discardCommentsCSS",
  "postcssNesting",
  "postcssLightDarkFunction",
  "autoprefixer",
];

function runContractChecks() {
  const checks = [];
  const gulpfilePath = path.join(ROOT_DIR, "packages/document-viewer/pdf.js/gulpfile.mjs");
  const templatePath = path.join(ROOT_DIR, "packages/document-viewer/bin/gulpfile.template.js");

  if (!exists(gulpfilePath) || !exists(templatePath)) {
    checks.push({
      name: "gulpfile template contract (files present)",
      ok: false,
      detail: `missing ${gulpfilePath} or ${templatePath}`,
    });
    return checks;
  }

  const gulpfile = fs.readFileSync(gulpfilePath, "utf-8");
  const missing = TEMPLATE_UPSTREAM_IDENTIFIERS.filter(
    (id) => !new RegExp(`\\b${id}\\b`).test(gulpfile)
  );
  checks.push({
    name: "gulpfile template upstream identifiers exist",
    ok: missing.length === 0,
    detail: missing.length
      ? `bin/gulpfile.template.js depends on identifiers no longer present in pdf.js/gulpfile.mjs: ${missing.join(
          ", "
        )}`
      : undefined,
  });

  // src/assets/viewer.css fully REPLACES the upstream compiled CSS in dist
  // (gulp task overrideStyle). It must be regenerated from
  // pdf.js/build/generic/web/viewer.css on every upgrade — a stale copy
  // silently drops icon rules and layout selectors (upstream moved from
  // class-based to id-based icon selectors; a stale override left every
  // toolbar icon blank on 2026-10-11).
  const overrideCssPath = path.join(ROOT_DIR, "packages/document-viewer/src/assets/viewer.css");
  const compiledCssPath = path.join(
    ROOT_DIR,
    "packages/document-viewer/pdf.js/build/generic/web/viewer.css"
  );
  if (exists(compiledCssPath)) {
    const templatePath = path.join(ROOT_DIR, "packages/document-viewer/src/viewer_template.js");
    const templateIds = exists(templatePath)
      ? [...fs.readFileSync(templatePath, "utf-8").matchAll(/data-dom-id="([^"]+)"/g)].map(
          (m) => m[1]
        )
      : [];
    // Only icon rules whose id still exists in the template are required:
    // upstream keeps dead legacy rules around (e.g. #viewThumbnail::before
    // at v5.7.284, where the sidebar buttons were replaced by the views
    // manager menus) — those never match our DOM either way.
    const iconSelectors = [
      ...fs.readFileSync(compiledCssPath, "utf-8").matchAll(/#([A-Za-z][\w-]*)::before\s*\{/g),
    ]
      .map((m) => m[1])
      .filter((id) => templateIds.includes(id));
    const overrideCss = fs.readFileSync(overrideCssPath, "utf-8");
    const missingIcons = iconSelectors.filter(
      (id) => !overrideCss.includes(`[data-dom-id="${id}"]`)
    );
    checks.push({
      name: "override viewer.css covers upstream icon selectors",
      ok: missingIcons.length === 0,
      detail: missingIcons.length
        ? `src/assets/viewer.css is stale — rerun transform:css (pnpm --filter @document-kits/viewer run transform:css); missing icon rules for: ${missingIcons.join(
            ", "
          )}`
        : undefined,
    });
    // Guard the transform itself: any template id still targeted via a bare
    // #id selector in the override CSS matches nothing in the embedded DOM.
    if (templateIds.length) {
      // The :is(#foo, [data-dom-id="foo"]) form is the expected rewrite
      // (it preserves id-level specificity); anything else still targeting
      // a template id via bare #foo never matches the embedded DOM.
      const stripped = overrideCss.replace(/:is\(#[\w-]+, \[data-dom-id="[\w-]+"\]\)/g, "");
      const bare = templateIds.filter((id) => new RegExp(`#${id}\\b`).test(stripped));
      checks.push({
        name: "override viewer.css rewrites template ids to data-dom-id",
        ok: bare.length === 0,
        detail: bare.length
          ? `these template ids are still targeted with bare #id selectors in src/assets/viewer.css (they never match the embedded DOM): ${bare.join(
              ", "
            )}`
          : undefined,
      });
    }
  }

  // The pdfjs-lib facade must expose exactly the same symbols as the
  // upstream web/pdfjs.js export surface — the webpack alias points web
  // code at our facade, so any drift breaks at runtime.
  const facadePath = path.join(ROOT_DIR, "packages/document-viewer/src/pdf_js/index.js");
  const upstreamPdfjsPath = path.join(ROOT_DIR, "packages/document-viewer/pdf.js/web/pdfjs.js");
  if (exists(facadePath) && exists(upstreamPdfjsPath)) {
    const exportsOf = (content) =>
      new Set(
        [...content.matchAll(/export\s*\{([^}]*)\}/g)]
          .flatMap((m) => m[1].split(","))
          .map((s) =>
            s
              .trim()
              .split(/\s+as\s+/)
              .pop()
          )
          .filter(Boolean)
      );
    const facadeExports = exportsOf(fs.readFileSync(facadePath, "utf-8"));
    const upstreamExports = exportsOf(fs.readFileSync(upstreamPdfjsPath, "utf-8"));
    const missingFromFacade = [...upstreamExports].filter((name) => !facadeExports.has(name));
    const extraInFacade = [...facadeExports].filter((name) => !upstreamExports.has(name));
    checks.push({
      name: "pdfjs-lib facade matches upstream web/pdfjs.js exports",
      ok: missingFromFacade.length === 0 && extraInFacade.length === 0,
      detail:
        missingFromFacade.length || extraInFacade.length
          ? `missing: [${missingFromFacade.join(", ")}] extra: [${extraInFacade.join(", ")}]`
          : undefined,
    });
  }

  return checks;
}

function printResults(checks) {
  for (const item of checks) {
    const label = item.ok ? "PASS" : "FAIL";
    console.log(`[${label}] ${item.name}`);
    if (!item.ok) {
      console.log(`       ${item.detail}`);
    }
  }
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }

    const checks = runSmoke(options);
    printResults(checks);

    const failed = checks.filter((item) => !item.ok);
    if (failed.length > 0) {
      console.error(`\nSmoke checks failed: ${failed.length}`);
      process.exit(1);
    }

    console.log(`\nSmoke checks passed: ${checks.length}`);
  } catch (error) {
    console.error(`[error] ${error.message}`);
    process.exit(1);
  }
}

main();
