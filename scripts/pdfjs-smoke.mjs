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

  if (exists(appBundlePath)) {
    checks.push(
      {
        name: "app.js exports createViewerApp",
        ok: checkFileContains(appBundlePath, "createViewerApp"),
        detail: "expected createViewerApp symbol in app bundle",
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
