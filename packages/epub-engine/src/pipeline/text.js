// Text extraction from a section document — own TreeWalker, deliberately not
// `doc.body.textContent` so script/style (and other non-content text) can be
// skipped node-by-node and the result stays whitespace-normalized for search
// and getTextContent.

/**
 * Extract the visible text of a document.
 *
 * @param {Document} doc a live or parsed section document
 * @returns {string} whitespace-collapsed text of the body ("" without one)
 */
export function extractText(doc) {
  const root = doc?.body ?? doc?.documentElement ?? null;
  if (!root) return "";
  // text inside script/style (and their kin) is not content
  const skip = new Set(["script", "style", "head", "title"]);
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_CDATA_SECTION, {
    acceptNode(node) {
      const name = node.parentElement?.localName?.toLowerCase();
      if (skip.has(name)) return NodeFilter.FILTER_REJECT;
      return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; // ignore empty text nodes
    },
  });
  let text = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    text += `${node.nodeValue} `;
  }
  return text.replace(/\s+/g, " ").trim();
}
