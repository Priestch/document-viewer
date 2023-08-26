import { LitElement, css, html } from "lit";
import { createViewerApp } from "@document-kits/viewer";
import "@document-kits/viewer/viewer.css";

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
export class DocumentViewer extends LitElement {
  constructor() {
    super();
    this.viewerOptions = {
      src: "compressed.tracemonkey-pldi-09.pdf",
      resourcePath: "document-viewer",
      disableCORSCheck: true,
    };
  }

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    createViewerApp({ parent: this.viewerEl, ...this.viewerOptions });
  }

  get viewerEl() {
    return this.renderRoot?.querySelector("#viewer") ?? null;
  }

  render() {
    return html` <div id="viewer"></div> `;
  }
}

window.customElements.define("document-viewer", DocumentViewer);
