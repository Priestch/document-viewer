// Rewrites id selectors (#foo) in the upstream compiled viewer.css into
// [data-dom-id="foo"] attribute selectors, matching the DOM emitted by
// viewer_template.js: transform:html strips element ids so that multiple
// viewers can live on one page, but upstream CSS is id-selector based —
// without this rewrite no rule matches (blank toolbar icons, missing
// position:absolute on the viewer container, etc).
//
// Run after `pnpm viewer:build` (it consumes the compiled CSS from
// pdf.js/build/generic/web/viewer.css and writes src/assets/viewer.css,
// which the gulp task overrideStyle then copies over dist).

const fs = require("fs");
const path = require("path");

const pkgRoot = path.resolve(__dirname, "..");
const compiledCssPath = path.join(pkgRoot, "pdf.js/build/generic/web/viewer.css");
const templatePath = path.join(pkgRoot, "src/viewer_template.js");
const outputPath = path.join(pkgRoot, "src/assets/viewer.css");

const template = fs.readFileSync(templatePath, "utf-8");
const domIds = new Set([...template.matchAll(/data-dom-id="([^"]+)"/g)].map((m) => m[1]));

const css = fs.readFileSync(compiledCssPath, "utf-8");

// Only rewrite within selector segments, never inside declaration bodies —
// hex colors (#fff) and url() fragments there must stay untouched. A stack
// tracks whether each open block is a group rule (@media/@supports/...),
// whose children are again rules with selectors, or a style rule, whose
// body is declarations.
//
// #foo is rewritten to :is(#foo, [data-dom-id="foo"]) rather than a bare
// attribute selector on purpose: :is() takes the specificity of its most
// specific argument, i.e. (1,0,0) — exactly what the id selector had.
// A bare [data-dom-id="foo"] is only (0,1,0) and loses ties against class
// rules that follow it in source order (e.g. .toolbarHorizontalGroup's
// height:100% overriding #toolbarSidebar's height:32px blew the sidebar
// toolbar up to container height and parked an invisible giant button on
// top of the pages — 2026-10-11). The #foo arm never matches anything in
// the embedded DOM (ids are stripped), so only the attribute arm selects.
const GROUP_AT_RULE = /^@(media|supports|layer|container|scope|document)\b/;

function rewriteSelector(selector) {
  return selector.replace(/#([A-Za-z][\w-]*)/g, (match, id) =>
    domIds.has(id) ? `:is(#${id}, [data-dom-id="${id}"])` : match
  );
}

let out = "";
const blockStack = []; // true = group rule (children are rules)
let selectorBuf = "";
let inSelector = true; // stack empty -> top level, text is selectors/at-rules
for (const ch of css) {
  if (ch === "{") {
    const isGroup = GROUP_AT_RULE.test(selectorBuf.trimStart());
    out += rewriteSelector(selectorBuf);
    selectorBuf = "";
    blockStack.push(isGroup);
    out += ch;
    inSelector = isGroup;
  } else if (ch === "}") {
    out += ch;
    blockStack.pop();
    inSelector = blockStack.length ? blockStack[blockStack.length - 1] : true;
  } else if (inSelector) {
    selectorBuf += ch;
  } else {
    out += ch;
  }
}
out += selectorBuf;

fs.writeFileSync(outputPath, out);
console.log(
  `transform-css: rewrote id selectors against ${domIds.size} data-dom-ids -> ${outputPath}`
);
