#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const SUBMODULE_PATH = path.join(ROOT_DIR, "packages/document-viewer/pdf.js");
const SOURCE_CHECK_FILES = {
  gulpTemplate: "packages/document-viewer/bin/gulpfile.template.js",
  appManager: "packages/document-viewer/src/app_manager.js",
  appHelper: "packages/document-viewer/src/app_helper.js",
  appOptions: "packages/document-viewer/src/application_options.js",
  defaultApp: "packages/document-viewer/src/default_app.js",
  viewerTemplate: "packages/document-viewer/src/viewer_template.js",
};

function printHelp() {
  console.log(`Usage: pnpm pdfjs:upgrade --to <commit> [options]

Options:
  --to <commit>        Target commit in packages/document-viewer/pdf.js (required)
  --from <commit>      Base commit for delta report (default: current submodule HEAD)
  --report <path>      Output markdown report path
  --skip-sync          Skip syncWithUpstream/extract:js steps
  --skip-build         Skip viewer/demos build steps
  --skip-smoke         Skip smoke checks
  --dry-run            Read-only mode: collect diffs/checks without checkout/sync/build
  --ci                 CI mode (non-interactive logs)
  --require-smoke-pass Fail if smoke script exits non-zero
  --help               Show this help
`);
}

function parseArgs(argv) {
  const parsed = {
    to: "",
    from: "",
    report: "",
    skipSync: false,
    skipBuild: false,
    skipSmoke: false,
    dryRun: false,
    ci: false,
    requireSmokePass: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--to":
        parsed.to = argv[++i] ?? "";
        break;
      case "--from":
        parsed.from = argv[++i] ?? "";
        break;
      case "--report":
        parsed.report = argv[++i] ?? "";
        break;
      case "--skip-sync":
        parsed.skipSync = true;
        break;
      case "--skip-build":
        parsed.skipBuild = true;
        break;
      case "--skip-smoke":
        parsed.skipSmoke = true;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--ci":
        parsed.ci = true;
        break;
      case "--require-smoke-pass":
        parsed.requireSmokePass = true;
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function resolvePath(rootDir, relativePath) {
  return path.resolve(rootDir, relativePath);
}

function readTextFile(rootDir, relativePath) {
  return fs.readFileSync(resolvePath(rootDir, relativePath), "utf-8");
}

function commandAsText(command, args, cwd) {
  return `${command} ${args.join(" ")} (cwd: ${cwd})`;
}

function runCommand({
  step,
  command,
  args,
  cwd = ROOT_DIR,
  capture = false,
  allowFailure = false,
  steps,
}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf-8",
    stdio: capture ? "pipe" : "inherit",
    env: process.env,
  });

  const endedAt = Date.now();
  const entry = {
    step,
    command: commandAsText(command, args, cwd),
    status: result.status === 0 ? "ok" : "failed",
    durationMs: endedAt - startedAt,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
  steps.push(entry);

  if (result.status !== 0 && !allowFailure) {
    const stderr = entry.stderr || "<no stderr>";
    throw new Error(`Step failed: ${step}\nCommand: ${entry.command}\n${stderr}`);
  }

  return entry;
}

function addSkippedStep({ step, reason, steps }) {
  steps.push({
    step,
    command: reason,
    status: "skipped",
    durationMs: 0,
    stdout: "",
    stderr: "",
  });
}

function shortCommit(commit) {
  return commit.slice(0, 8);
}

function utcNow() {
  return new Date().toISOString();
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function checkSourceContracts(rootDir) {
  const checks = [];

  function assertCheck(name, ok, detail) {
    checks.push({ name, ok, detail });
  }

  const gulpTemplate = readTextFile(rootDir, SOURCE_CHECK_FILES.gulpTemplate);
  const aliasMatches = gulpTemplate.match(/resolve\.alias\["pdfjs-lib"\]/g) ?? [];
  assertCheck(
    "webpack alias for pdfjs-lib is configured in both app/library bundles",
    aliasMatches.length >= 2,
    `found ${aliasMatches.length} alias declaration(s)`
  );

  const appOptions = readTextFile(rootDir, SOURCE_CHECK_FILES.appOptions);
  assertCheck(
    "application options point worker to .mjs",
    appOptions.includes("pdf.worker.mjs"),
    "expected pdf.worker.mjs in workerSrc"
  );
  assertCheck(
    "application options point sandbox to .mjs",
    appOptions.includes("pdf.sandbox.mjs"),
    "expected pdf.sandbox.mjs in sandboxBundleSrc"
  );
  assertCheck(
    "application options include debuggerSrc as debugger.mjs",
    appOptions.includes("debuggerSrc") && appOptions.includes("debugger.mjs"),
    "expected debuggerSrc=./debugger.mjs"
  );

  const appManager = readTextFile(rootDir, SOURCE_CHECK_FILES.appManager);
  assertCheck(
    "annotation editor params include free highlight thickness",
    appManager.includes("editorFreeHighlightThickness"),
    "expected editorFreeHighlightThickness binding"
  );
  assertCheck(
    "annotation editor params include highlight visibility toggle",
    appManager.includes("editorHighlightShowAll"),
    "expected editorHighlightShowAll binding"
  );
  assertCheck(
    "debugger script path uses debugger.mjs",
    appManager.includes("debuggerScriptPath") && appManager.includes("debugger.mjs"),
    "expected debuggerScriptPath with .mjs"
  );

  const viewerTemplate = readTextFile(rootDir, SOURCE_CHECK_FILES.viewerTemplate);
  assertCheck(
    "viewer template includes highlight thickness control",
    viewerTemplate.includes('data-dom-id="editorFreeHighlightThickness"'),
    "expected editorFreeHighlightThickness element"
  );
  assertCheck(
    "viewer template includes highlight show-all toggle",
    viewerTemplate.includes('data-dom-id="editorHighlightShowAll"'),
    "expected editorHighlightShowAll element"
  );
  assertCheck(
    "viewer template no longer includes static file input",
    !viewerTemplate.includes('data-dom-id="fileInput"'),
    "expected removal of static file input from template"
  );

  const defaultApp = readTextFile(rootDir, SOURCE_CHECK_FILES.defaultApp);
  assertCheck(
    "default app creates open-file input dynamically",
    defaultApp.includes("this._openFileInput") &&
      defaultApp.includes('document.createElement("input")') &&
      defaultApp.includes("document.body.append(fileInput)"),
    "expected dynamic hidden input creation"
  );

  const appHelper = readTextFile(rootDir, SOURCE_CHECK_FILES.appHelper);
  assertCheck(
    "helper does not call PDFPrintServiceFactory.initGlobals directly",
    !appHelper.includes("PDFPrintServiceFactory.initGlobals"),
    "print service binding must stay in src/app.js bindServices"
  );
  assertCheck(
    "open-file handler clicks dynamic input",
    appHelper.includes("_openFileInput?.click()"),
    "expected _openFileInput?.click()"
  );

  const failed = checks.filter((item) => !item.ok);
  return {
    checks,
    failed,
  };
}

function makeReport({
  dryRun,
  startedAt,
  endedAt,
  fromCommit,
  toCommit,
  currentCommit,
  submoduleChanged,
  changeLogOutput,
  diffStatOutput,
  sourceContracts,
  steps,
  statusOutput,
  smokeStatus,
  error,
}) {
  const durationMs = endedAt - startedAt;
  const statusLine = error ? "FAILED" : "SUCCESS";
  const commandRows = steps
    .map((entry) => {
      const ms = `${entry.durationMs}ms`;
      const safeCommand = entry.command.replace(/\|/g, "\\|");
      return `| ${entry.step} | ${entry.status} | ${ms} | \`${safeCommand}\` |`;
    })
    .join("\n");

  const failedContracts = sourceContracts.failed
    .map((item) => `- ${item.name}: ${item.detail}`)
    .join("\n");

  const contractRows = sourceContracts.checks
    .map((item) => `| ${item.name} | ${item.ok ? "pass" : "fail"} | ${item.detail} |`)
    .join("\n");

  return `# PDF.js Upgrade Automation Report

- Status: **${statusLine}**
- Mode: **${dryRun ? "DRY RUN" : "APPLY"}**
- Generated at (UTC): ${utcNow()}
- Duration: ${durationMs} ms
- Command: \`node scripts/pdfjs-upgrade.mjs ${process.argv.slice(2).join(" ")}\`

## Commits

- From: \`${fromCommit}\`
- To: \`${toCommit}\`
- Current submodule head after run: \`${currentCommit}\`
- Submodule checkout changed: ${submoduleChanged ? "yes" : "no"}
${
  dryRun
    ? "- Dry-run note: source contract checks were executed against current workspace files."
    : ""
}

## Upstream change snapshot

### web/pdfjs.js commit log (${shortCommit(fromCommit)}..${shortCommit(toCommit)})

\`\`\`text
${changeLogOutput || "<no commits in range for web/pdfjs.js>"}
\`\`\`

### Critical file diff stat

\`\`\`text
${diffStatOutput || "<no diff output>"}
\`\`\`

## Source integration contract checks

| Check | Result | Detail |
|---|---|---|
${contractRows}

${failedContracts ? `### Contract failures\n\n${failedContracts}\n` : ""}

## Command execution

| Step | Status | Duration | Command |
|---|---|---|---|
${commandRows || "<none>"}

## Smoke

- Smoke status: ${smokeStatus}

## Git status (short)

\`\`\`text
${statusOutput || "<clean>"}
\`\`\`

${error ? `## Error\n\n\`\`\`text\n${error.message}\n\`\`\`` : ""}
`;
}

function ensureRepoLayout() {
  const requiredPaths = [
    "package.json",
    "packages/document-viewer/package.json",
    "packages/document-viewer/pdf.js",
    "scripts",
  ];

  for (const relativePath of requiredPaths) {
    const absolutePath = resolvePath(ROOT_DIR, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Required path not found: ${relativePath}`);
    }
  }
}

function resolveReportPath(options, fromCommit, toCommit) {
  if (options.report) {
    return resolvePath(ROOT_DIR, options.report);
  }

  const fileName = `${dateStamp()}-pdfjs-upgrade-auto-${shortCommit(fromCommit)}-to-${shortCommit(
    toCommit
  )}.md`;
  return resolvePath(ROOT_DIR, path.join("docs/plans", fileName));
}

function writeReport(reportPath, content) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, content);
}

function main() {
  const startedAt = Date.now();
  const steps = [];

  let reportPath = "";
  let options;
  let fromCommit = "";
  let toCommit = "";
  let currentCommit = "";
  let submoduleChanged = false;
  let changeLogOutput = "";
  let diffStatOutput = "";
  let sourceContracts = { checks: [], failed: [] };
  let statusOutput = "";
  let smokeStatus = "not-run";

  try {
    options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }

    if (!options.to) {
      throw new Error("Missing required argument: --to <commit>");
    }

    ensureRepoLayout();

    const headEntry = runCommand({
      step: "resolve-current-submodule-head",
      command: "git",
      args: ["-C", SUBMODULE_PATH, "rev-parse", "HEAD"],
      capture: true,
      steps,
    });
    const originalHead = headEntry.stdout;

    fromCommit = options.from || originalHead;
    toCommit = options.to;

    runCommand({
      step: "verify-target-commit-exists",
      command: "git",
      args: ["-C", SUBMODULE_PATH, "cat-file", "-e", `${toCommit}^{commit}`],
      capture: true,
      steps,
    });

    const changeLogEntry = runCommand({
      step: "collect-web-pdfjs-log",
      command: "git",
      args: [
        "-C",
        SUBMODULE_PATH,
        "log",
        "--reverse",
        "--oneline",
        `${fromCommit}..${toCommit}`,
        "--",
        "web/pdfjs.js",
      ],
      capture: true,
      steps,
      allowFailure: true,
    });
    changeLogOutput = changeLogEntry.stdout || changeLogEntry.stderr;

    const diffStatEntry = runCommand({
      step: "collect-critical-diff-stat",
      command: "git",
      args: [
        "-C",
        SUBMODULE_PATH,
        "diff",
        "--stat",
        fromCommit,
        toCommit,
        "--",
        "web/pdfjs.js",
        "web/app.js",
        "web/app_options.js",
        "gulpfile.mjs",
      ],
      capture: true,
      steps,
      allowFailure: true,
    });
    diffStatOutput = diffStatEntry.stdout || diffStatEntry.stderr;

    if (originalHead !== toCommit) {
      if (options.dryRun) {
        addSkippedStep({
          step: "checkout-target-submodule-commit",
          reason: "dry-run: checkout skipped",
          steps,
        });
      } else {
        runCommand({
          step: "checkout-target-submodule-commit",
          command: "git",
          args: ["-C", SUBMODULE_PATH, "checkout", toCommit],
          steps,
        });
        submoduleChanged = true;
      }
    }

    if (options.dryRun) {
      addSkippedStep({
        step: "sync-wrapper-template-from-upstream",
        reason: "dry-run: syncWithUpstream skipped",
        steps,
      });
      addSkippedStep({
        step: "extract-wrapper-js",
        reason: "dry-run: extract:js skipped",
        steps,
      });
    } else if (!options.skipSync) {
      runCommand({
        step: "sync-wrapper-template-from-upstream",
        command: "pnpm",
        args: ["--filter", "@document-kits/viewer", "run", "syncWithUpstream"],
        steps,
      });
      runCommand({
        step: "extract-wrapper-js",
        command: "pnpm",
        args: ["--filter", "@document-kits/viewer", "run", "extract:js"],
        steps,
      });
    }

    sourceContracts = checkSourceContracts(ROOT_DIR);
    if (sourceContracts.failed.length > 0) {
      const details = sourceContracts.failed
        .map((item) => `- ${item.name}: ${item.detail}`)
        .join("\n");
      throw new Error(`Source integration contract check failed:\n${details}`);
    }

    if (options.dryRun) {
      addSkippedStep({
        step: "build-viewer",
        reason: "dry-run: viewer build skipped",
        steps,
      });
      addSkippedStep({
        step: "build-demos",
        reason: "dry-run: demos build skipped",
        steps,
      });
    } else if (!options.skipBuild) {
      runCommand({
        step: "build-viewer",
        command: "pnpm",
        args: ["viewer:build"],
        steps,
      });
      runCommand({
        step: "build-demos",
        command: "pnpm",
        args: ["demos:build"],
        steps,
      });
    }

    if (options.dryRun) {
      smokeStatus = "skipped (dry-run)";
      addSkippedStep({
        step: "smoke-check-dist-assets",
        reason: "dry-run: smoke checks skipped",
        steps,
      });
    } else if (!options.skipSmoke) {
      const smokeEntry = runCommand({
        step: "smoke-check-dist-assets",
        command: "node",
        args: ["scripts/pdfjs-smoke.mjs"],
        capture: true,
        steps,
        allowFailure: !options.requireSmokePass,
      });
      smokeStatus = smokeEntry.status === "ok" ? "pass" : "failed (non-blocking)";
    } else {
      smokeStatus = "skipped";
    }

    const currentHeadEntry = runCommand({
      step: "resolve-current-submodule-head-after-upgrade",
      command: "git",
      args: ["-C", SUBMODULE_PATH, "rev-parse", "HEAD"],
      capture: true,
      steps,
    });
    currentCommit = currentHeadEntry.stdout;

    const statusEntry = runCommand({
      step: "collect-git-status",
      command: "git",
      args: ["status", "--short"],
      capture: true,
      steps,
    });
    statusOutput = statusEntry.stdout;

    reportPath = resolveReportPath(options, fromCommit, toCommit);
    const report = makeReport({
      dryRun: options.dryRun,
      startedAt,
      endedAt: Date.now(),
      fromCommit,
      toCommit,
      currentCommit,
      submoduleChanged,
      changeLogOutput,
      diffStatOutput,
      sourceContracts,
      steps,
      statusOutput,
      smokeStatus,
      error: null,
    });
    writeReport(reportPath, report);

    console.log(`\n[done] PDF.js upgrade automation completed.`);
    console.log(`[done] Report saved to: ${path.relative(ROOT_DIR, reportPath)}`);
  } catch (error) {
    if (!options) {
      options = {
        to: "",
        from: "",
        report: "",
        skipSync: false,
        skipBuild: false,
        skipSmoke: false,
        dryRun: false,
        ci: false,
        requireSmokePass: false,
      };
    }

    if (!fromCommit) {
      fromCommit = "unknown";
    }
    if (!toCommit) {
      toCommit = options.to || "unknown";
    }
    if (!currentCommit) {
      try {
        const entry = runCommand({
          step: "resolve-current-submodule-head-after-failure",
          command: "git",
          args: ["-C", SUBMODULE_PATH, "rev-parse", "HEAD"],
          capture: true,
          steps,
          allowFailure: true,
        });
        currentCommit = entry.stdout || "unknown";
      } catch {
        currentCommit = "unknown";
      }
    }

    try {
      const entry = runCommand({
        step: "collect-git-status-after-failure",
        command: "git",
        args: ["status", "--short"],
        capture: true,
        steps,
        allowFailure: true,
      });
      statusOutput = entry.stdout;
    } catch {
      statusOutput = "<unavailable>";
    }

    if (!reportPath) {
      reportPath = resolvePath(
        ROOT_DIR,
        path.join("docs/plans", `${dateStamp()}-pdfjs-upgrade-auto-failed.md`)
      );
    }

    const report = makeReport({
      dryRun: options.dryRun,
      startedAt,
      endedAt: Date.now(),
      fromCommit,
      toCommit,
      currentCommit,
      submoduleChanged,
      changeLogOutput,
      diffStatOutput,
      sourceContracts,
      steps,
      statusOutput,
      smokeStatus,
      error,
    });
    writeReport(reportPath, report);

    console.error(`\n[error] PDF.js upgrade automation failed: ${error.message}`);
    console.error(`[error] Failure report saved to: ${path.relative(ROOT_DIR, reportPath)}`);
    process.exit(1);
  }
}

main();
