/**
 * Inject locale resource.
 * @param {string} localeUrl
 */
function injectLocaleResource(localeUrl) {
  const type = "application/l10n";
  let linkEl = document.querySelector(`link[type="${type}"]`);
  if (linkEl && linkEl.getAttribute("href") === localeUrl) {
    return;
  }

  linkEl = document.createElement("link");
  linkEl.rel = "resource";
  linkEl.type = type;
  linkEl.href = localeUrl;
  document.head.appendChild(linkEl);
}

export { injectLocaleResource };
