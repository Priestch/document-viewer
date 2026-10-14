// Default reader typography recipe — the layer foliate leaves to the host
// app (its demo reader.js injects this via renderer.setStyles; see
// ~/Enter/pdf.js/foliate-js/reader.js getCSS). Our engine injects it at
// mount so a bare EpubEngine reads like a book instead of raw author CSS,
// and re-injects on setStyle() without reloading the iframe (frame.js
// setStyles swaps the style element's textContent in place).
//
// Ported from foliate reader.js:6-47 with parameter defaults of our own.

/**
 * Build the default typography CSS.
 *
 * @param {object} [options]
 * @param {number} [options.lineHeight=1.6] Line height for block text.
 * @param {boolean} [options.justify=false] Justify paragraph text.
 * @param {boolean} [options.hyphenate=false] Automatic hyphenation.
 * @param {string} [options.fontFamily] Font stack override.
 * @param {string} [options.fontSize] Font-size override (any CSS unit).
 * @returns {string}
 */
export function defaultStyleCSS({
  lineHeight = 1.6,
  justify = false,
  hyphenate = false,
  fontFamily,
  fontSize,
} = {}) {
  const font = [
    fontFamily ? `font-family: ${fontFamily};` : "",
    fontSize ? `font-size: ${fontSize};` : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  return `
    @namespace epub "http://www.idpf.org/2007/ops";
    html {
        color-scheme: light dark;
    }
    /* https://github.com/whatwg/html/issues/5426 */
    @media (prefers-color-scheme: dark) {
        a:link {
            color: lightblue;
        }
    }
    ${font ? `html {\n    ${font}\n}` : ""}
    p, li, blockquote, dd {
        line-height: ${lineHeight};
        text-align: ${justify ? "justify" : "start"};
        -webkit-hyphens: ${hyphenate ? "auto" : "manual"};
        hyphens: ${hyphenate ? "auto" : "manual"};
        -webkit-hyphenate-limit-before: 3;
        -webkit-hyphenate-limit-after: 2;
        -webkit-hyphenate-limit-lines: 2;
        hanging-punctuation: allow-end last;
        widows: 2;
    }
    /* prevent the above from overriding the align attribute */
    [align="left"] { text-align: left; }
    [align="right"] { text-align: right; }
    [align="center"] { text-align: center; }
    [align="justify"] { text-align: justify; }

    pre {
        white-space: pre-wrap !important;
    }
    aside[epub|type~="endnote"],
    aside[epub|type~="footnote"],
    aside[epub|type~="note"],
    aside[epub|type~="rearnote"] {
        display: none;
    }
`;
}
