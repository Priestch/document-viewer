import { createHelper } from "./app_helper.js";
import { ViewerApplication, PDFPrintServiceFactory } from "./default_app.js";
import { bindExternalService, bindPrintServiceFactory } from "./external_service.js";
import { TouchManager } from "../pdf.js/src/display/touch_manager.js";
import { shadow } from "pdfjs-lib";
import { bindReaderShell } from "./reader_shell.js";

class PDFViewerApplication extends ViewerApplication {
  constructor(appOptions) {
    super();
    this.appOptions = appOptions;
    this.helper = createHelper(this);

    this.bindServices();
  }

  get externalServices() {
    const services = bindExternalService(this);
    return shadow(this, "externalServices", services);
  }

  bindServices() {
    bindPrintServiceFactory(PDFPrintServiceFactory);
  }

  run(config) {
    const { validateFileURL } = this.helper;
    return super.run(config, validateFileURL);
  }

  _parseHashParams() {
    const { loadFakeWorker } = this.helper;
    return super._parseHashParams(loadFakeWorker);
  }

  bindEvents() {
    if (this._eventBusAbortController) {
      return;
    }
    const ac = (this._eventBusAbortController = new AbortController());
    const opts = {
      signal: ac.signal,
    };
    const { eventBus, externalServices, pdfDocumentProperties, pdfViewer, preferences } = this;
    const updateShell = bindReaderShell(this.appConfig.appContainer, opts);
    const refreshShell = () =>
      updateShell({
        title: this.pdfDocument
          ? (this.documentInfo && this._docTitle) || this._docFilename
          : undefined,
        page: this.page,
        total: this.pagesCount,
        scale: pdfViewer.currentScale,
      });
    for (const name of [
      "documentinit",
      "metadataloaded",
      "pagesloaded",
      "pagechanging",
      "scalechanging",
    ]) {
      eventBus._on(name, refreshShell, opts);
    }
    eventBus._on("pagesdestroy", () => updateShell(), opts);
    eventBus._on("documenterror", () => updateShell({ message: "Unable to open document" }), opts);
    const {
      onResize,
      onHashchange,
      onPageRender,
      onPageRendered,
      onUpdateViewarea,
      onPageChanging,
      onScaleChanging,
      onRotationChanging,
      onSidebarViewChanged,
      onPageMode,
      onNamedAction,
      onPageNumberChanged,
      onViewerModesChanged,
      onImageAltTextSettings,
      onFindFromUrlHash,
      onUpdateFindMatchesCount,
      onUpdateFindControlState,
      onFileInputChange,
      onOpenFile,
    } = this.helper;

    eventBus._on("resize", onResize.bind(this), opts);
    eventBus._on("hashchange", onHashchange.bind(this), opts);
    eventBus._on("beforeprint", this.beforePrint.bind(this), opts);
    eventBus._on("afterprint", this.afterPrint.bind(this), opts);
    eventBus._on("pagerender", onPageRender.bind(this), opts);
    eventBus._on("pagerendered", onPageRendered.bind(this), opts);
    eventBus._on("updateviewarea", onUpdateViewarea.bind(this), opts);
    eventBus._on("pagechanging", onPageChanging.bind(this), opts);
    eventBus._on("scalechanging", onScaleChanging.bind(this), opts);
    eventBus._on("rotationchanging", onRotationChanging.bind(this), opts);
    eventBus._on("sidebarviewchanged", onSidebarViewChanged.bind(this), opts);
    eventBus._on("pagemode", onPageMode.bind(this), opts);
    eventBus._on("namedaction", onNamedAction.bind(this), opts);
    eventBus._on(
      "presentationmodechanged",
      (evt) => (pdfViewer.presentationModeState = evt.state),
      opts
    );
    eventBus._on("presentationmode", this.requestPresentationMode.bind(this), opts);
    eventBus._on(
      "switchannotationeditormode",
      (evt) => (pdfViewer.annotationEditorMode = evt),
      opts
    );
    eventBus._on("print", this.triggerPrinting.bind(this), opts);
    eventBus._on("download", this.downloadOrSave.bind(this), opts);
    eventBus._on("firstpage", () => (this.page = 1), opts);
    eventBus._on("lastpage", () => (this.page = this.pagesCount), opts);
    eventBus._on("nextpage", () => pdfViewer.nextPage(), opts);
    eventBus._on("previouspage", () => pdfViewer.previousPage(), opts);
    eventBus._on("zoomin", this.zoomIn.bind(this), opts);
    eventBus._on("zoomout", this.zoomOut.bind(this), opts);
    eventBus._on("zoomreset", this.zoomReset.bind(this), opts);
    eventBus._on("pagenumberchanged", onPageNumberChanged.bind(this), opts);
    eventBus._on("scalechanged", (evt) => (pdfViewer.currentScaleValue = evt.value), opts);
    eventBus._on("rotatecw", this.rotatePages.bind(this, 90), opts);
    eventBus._on("rotateccw", this.rotatePages.bind(this, -90), opts);
    eventBus._on(
      "optionalcontentconfig",
      (evt) => (pdfViewer.optionalContentConfigPromise = evt.promise),
      opts
    );
    eventBus._on("switchscrollmode", (evt) => (pdfViewer.scrollMode = evt.mode), opts);
    eventBus._on("scrollmodechanged", onViewerModesChanged.bind(this, "scrollMode"), opts);
    eventBus._on("switchspreadmode", (evt) => (pdfViewer.spreadMode = evt.mode), opts);
    eventBus._on("spreadmodechanged", onViewerModesChanged.bind(this, "spreadMode"), opts);
    eventBus._on("imagealttextsettings", onImageAltTextSettings.bind(this), opts);
    eventBus._on("documentproperties", () => pdfDocumentProperties?.open(), opts);
    eventBus._on("findfromurlhash", onFindFromUrlHash.bind(this), opts);
    eventBus._on("updatefindmatchescount", onUpdateFindMatchesCount.bind(this), opts);
    eventBus._on("updatefindcontrolstate", onUpdateFindControlState.bind(this), opts);
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      eventBus._on("fileinputchange", onFileInputChange.bind(this), opts);
      eventBus._on("openfile", onOpenFile.bind(this), opts);
    }
    if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) {
      eventBus._on(
        "annotationeditorstateschanged",
        (evt) => externalServices.updateEditorStates(evt),
        opts
      );
      eventBus._on(
        "reporttelemetry",
        (evt) => externalServices.reportTelemetry(evt.details),
        opts
      );
    }
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("TESTING || MOZCENTRAL")) {
      eventBus._on("setpreference", (evt) => preferences.set(evt.name, evt.value), opts);
    }
  }

  setTitle(title = this._title) {
    this._title = title;
    if (this.isViewerEmbedded) {
      // Embedded PDF viewers should not be changing their parent page's title.
      return;
    }
    if (this.appOptions.get("disableAutoSetTitle")) {
      return;
    }
    const editorIndicator = this._hasAnnotationEditors && !this.pdfRenderingQueue.printing;
    document.title = `${editorIndicator ? "* " : ""}${title}`;
  }

  bindWindowEvents() {
    if (this._windowAbortController) {
      return;
    }
    this._windowAbortController = new AbortController();
    const {
      eventBus,
      appConfig: { mainContainer },
      pdfViewer,
      _windowAbortController: { signal },
    } = this;
    const { onWheel, onClick, onKeyDown, onKeyUp } = this.helper;

    if (
      (typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL")) ||
      typeof AbortSignal.any === "function"
    ) {
      this._touchManager = new TouchManager({
        container: window,
        isPinchingDisabled: () => pdfViewer.isInPresentationMode,
        isPinchingStopped: () => this.overlayManager?.active,
        onPinching: this.touchPinchCallback.bind(this),
        onPinchEnd: this.touchPinchEndCallback.bind(this),
        signal,
      });
    }
    function addWindowResolutionChange(evt = null) {
      if (evt) {
        pdfViewer.refresh();
      }
      const mediaQueryList = window.matchMedia(
        `(resolution: ${window.devicePixelRatio || 1}dppx)`
      );
      mediaQueryList.addEventListener("change", addWindowResolutionChange, {
        once: true,
        signal,
      });
    }
    addWindowResolutionChange();

    window.addEventListener("wheel", onWheel.bind(this), {
      passive: false,
      signal,
    });
    window.addEventListener("click", onClick.bind(this), {
      signal,
    });
    window.addEventListener("keydown", onKeyDown.bind(this), {
      signal,
    });
    window.addEventListener("keyup", onKeyUp.bind(this), {
      signal,
    });
    window.addEventListener(
      "resize",
      () => {
        eventBus.dispatch("resize", {
          source: window,
        });
      },
      {
        signal,
      }
    );
    window.addEventListener(
      "hashchange",
      () => {
        eventBus.dispatch("hashchange", {
          source: window,
          hash: document.location.hash.substring(1),
        });
      },
      {
        signal,
      }
    );
    window.addEventListener(
      "beforeprint",
      () => {
        eventBus.dispatch("beforeprint", { source: window });
      },
      {
        signal,
      }
    );
    window.addEventListener(
      "afterprint",
      () => {
        eventBus.dispatch("afterprint", { source: window });
      },
      {
        signal,
      }
    );
    window.addEventListener(
      "updatefromsandbox",
      (event) => {
        eventBus.dispatch("updatefromsandbox", {
          source: window,
          detail: event.detail,
        });
      },
      {
        signal,
      }
    );
    if (
      (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) &&
      !("onscrollend" in document.documentElement)
    ) {
      return;
    }
    if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) {
      // Using the values lastScrollTop and lastScrollLeft is a workaround to
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1881974.
      // TODO: remove them once the bug is fixed.
      ({ scrollTop: this._lastScrollTop, scrollLeft: this._lastScrollLeft } = mainContainer);
    }
    const scrollend = () => {
      if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) {
        ({ scrollTop: this._lastScrollTop, scrollLeft: this._lastScrollLeft } = mainContainer);
      }
      this._isScrolling = false;
      mainContainer.addEventListener("scroll", scroll, {
        passive: true,
        signal,
      });
      mainContainer.removeEventListener("scrollend", scrollend);
      mainContainer.removeEventListener("blur", scrollend);
    };
    const scroll = () => {
      if (this._isCtrlKeyDown) {
        return;
      }
      if (
        (typeof PDFJSDev === "undefined" || !PDFJSDev.test("MOZCENTRAL")) &&
        this._lastScrollTop === mainContainer.scrollTop &&
        this._lastScrollLeft === mainContainer.scrollLeft
      ) {
        return;
      }
      mainContainer.removeEventListener("scroll", scroll, {
        passive: true,
      });
      this._isScrolling = true;
      mainContainer.addEventListener("scrollend", scrollend, {
        signal,
      });
      mainContainer.addEventListener("blur", scrollend, {
        signal,
      });
    };
    mainContainer.addEventListener("scroll", scroll, {
      passive: true,
      signal,
    });
  }

  /**
   * @private
   */
  _initializeAnnotationStorageCallbacks(pdfDocument) {
    if (pdfDocument !== this.pdfDocument) {
      return;
    }
    const { annotationStorage } = pdfDocument;
    annotationStorage.onSetModified = () => {
      window.addEventListener("beforeunload", this.helper.beforeUnload);
      if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
        this._annotationStorageModified = true;
      }
    };
    annotationStorage.onResetModified = () => {
      window.removeEventListener("beforeunload", this.helper.beforeUnload);
      if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
        delete this._annotationStorageModified;
      }
    };
    annotationStorage.onAnnotationEditor = (typeStr) => {
      this._hasAnnotationEditors = !!typeStr;
      this.setTitle();
    };
  }
}

export { PDFViewerApplication };
