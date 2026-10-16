// Presentation only: the host adapter supplies document state and owns commands.
let nextShellId = 0;

export function decorateReaderShell(fragment) {
  const q = (id) => fragment.querySelector(`[data-dom-id="${id}"]`);
  const root = q("outerContainer");
  root.classList.add("reader-shell");
  const header = document.createElement("header");
  header.className = "reader-shell-header";
  header.innerHTML = `
    <span class="reader-shell-mark" aria-hidden="true">D</span>
    <span class="reader-shell-title">Document</span>
    <label class="reader-shell-theme">Theme
      <select aria-label="Reader theme">
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`;
  q("mainContainer").prepend(header);

  const group = (name, nodes) => {
    const el = document.createElement("div");
    el.className = `reader-shell-group reader-shell-${name}`;
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", name === "navigation" ? "Page navigation" : "Find and outline");
    nodes[0].before(el);
    el.append(...nodes);
  };
  const left = q("toolbarViewerLeft");
  const children = [...left.children];
  const navigationStart = children.findIndex((el) => el.contains(q("previous")));
  group("browse", children.slice(0, navigationStart));
  group("navigation", children.slice(navigationStart));
  q("toolbarViewerMiddle").setAttribute("role", "group");
  q("toolbarViewerMiddle").setAttribute("aria-label", "Zoom");

  const toolsToggle = document.createElement("button");
  toolsToggle.type = "button";
  toolsToggle.className = "reader-shell-tools-toggle";
  toolsToggle.textContent = "Tools";
  toolsToggle.setAttribute("aria-expanded", "false");
  const editorTools = q("editorModeButtons");
  editorTools.id = `reader-shell-tools-${++nextShellId}`;
  toolsToggle.setAttribute("aria-controls", editorTools.id);
  editorTools.before(toolsToggle);

  const footer = document.createElement("footer");
  footer.className = "reader-shell-status";
  footer.innerHTML = `
    <span class="reader-shell-position" role="status" aria-label="Reading position">— / —</span>
    <progress class="reader-shell-progress" value="0" max="1" aria-label="Page position"></progress>
    <span class="reader-shell-scale" aria-label="Zoom level">—</span>`;
  q("mainContainer").append(footer);
  return fragment;
}

export function bindReaderShell(container, { signal }) {
  const root = container.querySelector(".reader-shell");
  if (!root) {
    return () => {};
  }
  const theme = root.querySelector(".reader-shell-theme select");
  theme.addEventListener(
    "change",
    () => {
      root.dataset.readerTheme = theme.value;
    },
    { signal }
  );

  const tools = root.querySelector(".reader-shell-tools-toggle");
  const setToolsOpen = (open) => {
    root.classList.toggle("reader-shell-tools-open", open);
    tools.setAttribute("aria-expanded", String(open));
  };
  tools.addEventListener(
    "click",
    () => {
      setToolsOpen(tools.getAttribute("aria-expanded") !== "true");
    },
    { signal }
  );
  root.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && tools.getAttribute("aria-expanded") === "true") {
        setToolsOpen(false);
        tools.focus();
      }
    },
    { signal }
  );

  const title = root.querySelector(".reader-shell-title");
  const position = root.querySelector(".reader-shell-position");
  const progress = root.querySelector(".reader-shell-progress");
  const scaleLabel = root.querySelector(".reader-shell-scale");
  const numbers = new Intl.NumberFormat();
  const percent = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 });
  return ({ title: name = "Document", page = 0, total = 0, scale = 0, message = "" } = {}) => {
    title.textContent = name;
    title.title = name;
    position.textContent =
      message || (total > 0 ? `${numbers.format(page)} / ${numbers.format(total)}` : "— / —");
    progress.max = total || 1;
    progress.value = page;
    progress.hidden = !total;
    scaleLabel.textContent = scale > 0 ? percent.format(scale) : "—";
  };
}
