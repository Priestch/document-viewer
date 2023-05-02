const fs = require("fs");
const path = require("path");
const prettier = require("prettier");
const HtmlAstTransform = require("html-ast-transform");
const { transform, h, withClass, getAttr, withAttr } = HtmlAstTransform;

const viewerHtml = path.resolve(__dirname, "../pdf.js/web/viewer.html");
const templateFile = path.resolve(__dirname, "../src/viewer_template.js");

function replaceIdAttr(node) {
  const idAttr = getAttr(node, "id");
  if (idAttr) {
    node = withAttr(node, "data-dom-id", idAttr);

    // add CSS class of id attribute for easier CSS style replace
    node = withClass(node, idAttr);

    // remove id attribute
    node = withAttr(node, "id", "invalidAttr");
    let attrs = node.attrs.filter(function (attr) {
      return attr.value !== "invalidAttr";
    });

    return h(node.nodeName, attrs, node.childNodes);
  }
  return node;
}

function wrapWithLabel(node) {
  const idAttr = getAttr(node, "id");
  if (idAttr) {
    const childNodes = node.parentNode.childNodes;
    const labelNode = childNodes.find(function (item) {
      return item.nodeName === "label" && getAttr(item, "for") === idAttr;
    });
    if (labelNode) {
      const l10Id = "data-l10n-id";
      const excludeAttrs = ["for", l10Id, "class"];
      const attrs = labelNode.attrs.filter(function (item) {
        return !excludeAttrs.includes(item.name);
      });
      const replacedInput = replaceIdAttr(node);
      const textAttrs = [{ name: "class", value: "toolbarLabel" }];
      const l10nAttr = getAttr(labelNode, l10Id);
      if (l10nAttr) {
        textAttrs.push({ name: l10Id, value: l10nAttr });
      }
      const textNode = h("span", textAttrs, labelNode.childNodes);
      return h("label", attrs, [replacedInput, textNode]);
    } else {
      return replaceIdAttr(node);
    }
  }
  return node;
}

function removeLabel(node) {
  const forAttr = getAttr(node, "for");
  if (forAttr) {
    return h("#comment", "Removed!");
  }
  return node;
}

fs.readFile(viewerHtml, "utf-8", (err, data) => {
  if (err) throw err;
  let result = transform(data, {
    replaceTags: {
      div: replaceIdAttr,
      button: replaceIdAttr,
      input: wrapWithLabel,
      label: removeLabel,
      dialog: replaceIdAttr,
      select: replaceIdAttr,
      a: replaceIdAttr,
      span: replaceIdAttr,
      p: replaceIdAttr,
    },
  });

  result = result.replaceAll(/<\/input>/g, "");
  result = prettier.format(result, { parser: "html" });

  const index = result.indexOf('<div data-dom-id="outerContainer" class="outerContainer">');
  const template = result.substring(index);

  const templateDeclare = "const template = `\n" + template + "`;";

  fs.writeFile(
    templateFile,
    `${templateDeclare}

let templateFragment;

/**
 * @returns {HTMLFrameElement}
 */
function getViewerTemplate() {
  if (!templateFragment) {
    const el = document.createElement("template");
    el.innerHTML = template;
    templateFragment = el.content;
  }
  return document.importNode(templateFragment, true);
}

export default getViewerTemplate;
`,
    () => {}
  );
});
