import {
  getActiveOrFocusedElement,
  normalizeWheelEventDirection,
  parseQueryString,
  RenderingStates,
  SidebarView
} from "../pdf.js/web/ui_utils";
import {
  GlobalWorkerOptions,
  loadScript,
  PDFWorker,
} from "pdfjs-lib";
import {CursorTool} from "../pdf.js/web/pdf_cursor_tools";

const WHEEL_ZOOM_DISABLED_TIMEOUT = 1000; // ms

function createHelper(PDFViewerApplication) {
  const AppOptions = PDFViewerApplication.appOptions;

  let validateFileURL;
  if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
    const HOSTED_VIEWER_ORIGINS = [
      "null",
      "http://mozilla.github.io",
      "https://mozilla.github.io",
    ];
    validateFileURL = function (file) {
      if (!file) {
        return;
      }
      try {
        const viewerOrigin = new URL(window.location.href).origin || "null";
        if (HOSTED_VIEWER_ORIGINS.includes(viewerOrigin)) {
          // Hosted or local viewer, allow for any file locations
          return;
        }
        if (AppOptions.get('disableCORSCheck')) {
          return;
        }
        const fileOrigin = new URL(file, window.location.href).origin;
        // Removing of the following line will not guarantee that the viewer will
        // start accepting URLs from foreign origin -- CORS headers on the remote
        // server must be properly configured.
        if (fileOrigin !== viewerOrigin) {
          throw new Error("file origin does not match viewer's");
        }
      } catch (ex) {
        PDFViewerApplication.l10n.get("loading_error").then(msg => {
          PDFViewerApplication._documentError(msg, { message: ex?.message });
        });
        throw ex;
      }
    };
  }

  async function loadFakeWorker() {
    GlobalWorkerOptions.workerSrc ||= AppOptions.get("workerSrc");

    if (typeof PDFJSDev === "undefined" || !PDFJSDev.test("PRODUCTION")) {
      window.pdfjsWorker = await import("pdfjs/core/worker.js");
      return;
    }
    await loadScript(PDFWorker.workerSrc);
  }

  async function loadPDFBug(self) {
    const { debuggerScriptPath } = self.appConfig;
    const { PDFBug } =
      typeof PDFJSDev === "undefined" || !PDFJSDev.test("PRODUCTION")
        ? await import(debuggerScriptPath) // eslint-disable-line no-unsanitized/method
        : await __non_webpack_import__(debuggerScriptPath); // eslint-disable-line no-undef

    self._PDFBug = PDFBug;
  }

  function reportPageStatsPDFBug({ pageNumber }) {
    if (!globalThis.Stats?.enabled) {
      return;
    }
    const pageView = PDFViewerApplication.pdfViewer.getPageView(
      /* index = */ pageNumber - 1
    );
    globalThis.Stats.add(pageNumber, pageView?.pdfPage?.stats);
  }

  function webViewerInitialized() {
    const { appConfig, eventBus } = PDFViewerApplication;
    let file;
    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      const queryString = document.location.search.substring(1);
      const params = parseQueryString(queryString);
      file = params.get("file") ?? AppOptions.get("defaultUrl");
      validateFileURL(file);
    } else if (PDFJSDev.test("MOZCENTRAL")) {
      file = window.location.href;
    } else if (PDFJSDev.test("CHROME")) {
      file = AppOptions.get("defaultUrl");
    }

    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
      const fileInput = appConfig.openFileInput;
      fileInput.value = null;

      fileInput.addEventListener("change", function (evt) {
        const { files } = evt.target;
        if (!files || files.length === 0) {
          return;
        }
        eventBus.dispatch("fileinputchange", {
          source: this,
          fileInput: evt.target,
        });
      });

      // Enable dragging-and-dropping a new PDF file onto the viewerContainer.
      appConfig.mainContainer.addEventListener("dragover", function (evt) {
        evt.preventDefault();

        evt.dataTransfer.dropEffect =
          evt.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
      });
      appConfig.mainContainer.addEventListener("drop", function (evt) {
        evt.preventDefault();

        const { files } = evt.dataTransfer;
        if (!files || files.length === 0) {
          return;
        }
        eventBus.dispatch("fileinputchange", {
          source: this,
          fileInput: evt.dataTransfer,
        });
      });
    }

    if (!PDFViewerApplication.supportsDocumentFonts) {
      AppOptions.set("disableFontFace", true);
      PDFViewerApplication.l10n.get("web_fonts_disabled").then(msg => {
        console.warn(msg);
      });
    }

    if (!PDFViewerApplication.supportsPrinting) {
      appConfig.toolbar.print.classList.add("hidden");
      appConfig.secondaryToolbar.printButton.classList.add("hidden");
    }

    if (!PDFViewerApplication.supportsFullscreen) {
      appConfig.toolbar.presentationModeButton.classList.add("hidden");
      appConfig.secondaryToolbar.presentationModeButton.classList.add("hidden");
    }

    if (PDFViewerApplication.supportsIntegratedFind) {
      appConfig.toolbar.viewFind.classList.add("hidden");
    }

    appConfig.mainContainer.addEventListener(
      "transitionend",
      function (evt) {
        if (evt.target === /* mainContainer */ this) {
          eventBus.dispatch("resize", { source: this });
        }
      },
      true
    );

    try {
      if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
        if (file) {
          PDFViewerApplication.open(file);
        } else {
          PDFViewerApplication._hideViewBookmark();
        }
      } else if (PDFJSDev.test("MOZCENTRAL || CHROME")) {
        PDFViewerApplication.setTitleUsingUrl(file, /* downloadUrl = */ file);
        PDFViewerApplication.initPassiveLoading();
      } else {
        throw new Error("Not implemented: webViewerInitialized");
      }
    } catch (reason) {
      PDFViewerApplication.l10n.get("loading_error").then(msg => {
        PDFViewerApplication._documentError(msg, reason);
      });
    }
  }

  function webViewerPageRendered({ pageNumber, error }) {
    // If the page is still visible when it has finished rendering,
    // ensure that the page number input loading indicator is hidden.
    if (pageNumber === PDFViewerApplication.page) {
      PDFViewerApplication.toolbar.updateLoadingIndicatorState(false);
    }

    // Use the rendered page to set the corresponding thumbnail image.
    if (PDFViewerApplication.pdfSidebar.visibleView === SidebarView.THUMBS) {
      const pageView = PDFViewerApplication.pdfViewer.getPageView(
        /* index = */ pageNumber - 1
      );
      const thumbnailView = PDFViewerApplication.pdfThumbnailViewer.getThumbnail(
        /* index = */ pageNumber - 1
      );
      if (pageView && thumbnailView) {
        thumbnailView.setImage(pageView);
      }
    }

    if (error) {
      PDFViewerApplication.l10n.get("rendering_error").then(msg => {
        PDFViewerApplication._otherError(msg, error);
      });
    }

    // It is a good time to report stream and font types.
    PDFViewerApplication._reportDocumentStatsTelemetry();
  }

  function webViewerPageMode({ mode }) {
    // Handle the 'pagemode' hash parameter, see also `PDFLinkService_setHash`.
    let view;
    switch (mode) {
      case "thumbs":
        view = SidebarView.THUMBS;
        break;
      case "bookmarks":
      case "outline": // non-standard
        view = SidebarView.OUTLINE;
        break;
      case "attachments": // non-standard
        view = SidebarView.ATTACHMENTS;
        break;
      case "layers": // non-standard
        view = SidebarView.LAYERS;
        break;
      case "none":
        view = SidebarView.NONE;
        break;
      default:
        console.error('Invalid "pagemode" hash parameter: ' + mode);
        return;
    }
    PDFViewerApplication.pdfSidebar.switchView(view, /* forceOpen = */ true);
  }

  function webViewerNamedAction(evt) {
    // Processing a couple of named actions that might be useful, see also
    // `PDFLinkService.executeNamedAction`.
    switch (evt.action) {
      case "GoToPage":
        PDFViewerApplication.appConfig.toolbar.pageNumber.select();
        break;

      case "Find":
        if (!PDFViewerApplication.supportsIntegratedFind) {
          PDFViewerApplication.findBar.toggle();
        }
        break;

      case "Print":
        PDFViewerApplication.triggerPrinting();
        break;

      case "SaveAs":
        PDFViewerApplication.downloadOrSave();
        break;
    }
  }

  function webViewerPresentationModeChanged(evt) {
    PDFViewerApplication.pdfViewer.presentationModeState = evt.state;
  }

  function webViewerSidebarViewChanged({ view }) {
    PDFViewerApplication.pdfRenderingQueue.isThumbnailViewEnabled =
      view === SidebarView.THUMBS;

    if (PDFViewerApplication.isInitialViewSet) {
      // Only update the storage when the document has been loaded *and* rendered.
      PDFViewerApplication.store?.set("sidebarView", view).catch(() => {
        // Unable to write to storage.
      });
    }
  }

  function webViewerUpdateViewarea({ location }) {
    if (PDFViewerApplication.isInitialViewSet) {
      // Only update the storage when the document has been loaded *and* rendered.
      PDFViewerApplication.store
        ?.setMultiple({
          page: location.pageNumber,
          zoom: location.scale,
          scrollLeft: location.left,
          scrollTop: location.top,
          rotation: location.rotation,
        })
        .catch(() => {
          // Unable to write to storage.
        });
    }
    const href = PDFViewerApplication.pdfLinkService.getAnchorUrl(
      location.pdfOpenParams
    );
    PDFViewerApplication.appConfig.toolbar.viewBookmark.href = href;
    PDFViewerApplication.appConfig.secondaryToolbar.viewBookmarkButton.href =
      href;

    // Show/hide the loading indicator in the page number input element.
    const currentPage = PDFViewerApplication.pdfViewer.getPageView(
      /* index = */ PDFViewerApplication.page - 1
    );
    const loading = currentPage?.renderingState !== RenderingStates.FINISHED;
    PDFViewerApplication.toolbar.updateLoadingIndicatorState(loading);
  }

  function webViewerScrollModeChanged(evt) {
    if (PDFViewerApplication.isInitialViewSet) {
      // Only update the storage when the document has been loaded *and* rendered.
      PDFViewerApplication.store?.set("scrollMode", evt.mode).catch(() => {
        // Unable to write to storage.
      });
    }
  }

  function webViewerSpreadModeChanged(evt) {
    if (PDFViewerApplication.isInitialViewSet) {
      // Only update the storage when the document has been loaded *and* rendered.
      PDFViewerApplication.store?.set("spreadMode", evt.mode).catch(() => {
        // Unable to write to storage.
      });
    }
  }

  function webViewerResize() {
    const { pdfDocument, pdfViewer, pdfRenderingQueue } = PDFViewerApplication;

    if (pdfRenderingQueue.printing && window.matchMedia("print").matches) {
      // Work-around issue 15324 by ignoring "resize" events during printing.
      return;
    }
    pdfViewer.updateContainerHeightCss();

    if (!pdfDocument) {
      return;
    }
    const currentScaleValue = pdfViewer.currentScaleValue;
    if (
      currentScaleValue === "auto" ||
      currentScaleValue === "page-fit" ||
      currentScaleValue === "page-width"
    ) {
      // Note: the scale is constant for 'page-actual'.
      pdfViewer.currentScaleValue = currentScaleValue;
    }
    pdfViewer.update();
  }

  function webViewerHashchange(evt) {
    const hash = evt.hash;
    if (!hash) {
      return;
    }
    if (!PDFViewerApplication.isInitialViewSet) {
      PDFViewerApplication.initialBookmark = hash;
    } else if (!PDFViewerApplication.pdfHistory?.popStateInProgress) {
      PDFViewerApplication.pdfLinkService.setHash(hash);
    }
  }

  if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
    // eslint-disable-next-line no-var
    var webViewerFileInputChange = function (evt) {
      if (PDFViewerApplication.pdfViewer?.isInPresentationMode) {
        return; // Opening a new PDF file isn't supported in Presentation Mode.
      }
      const file = evt.fileInput.files[0];

      let url = URL.createObjectURL(file);
      if (file.name) {
        url = { url, originalUrl: file.name };
      }
      PDFViewerApplication.open(url);
    };

    // eslint-disable-next-line no-var
    var webViewerOpenFile = function (evt) {
      const fileInput = PDFViewerApplication.appConfig.openFileInput;
      fileInput.click();
    };
  }

  function webViewerPresentationMode() {
    PDFViewerApplication.requestPresentationMode();
  }
  function webViewerSwitchAnnotationEditorMode(evt) {
    PDFViewerApplication.pdfViewer.annotationEditorMode = evt.mode;
  }
  function webViewerSwitchAnnotationEditorParams(evt) {
    PDFViewerApplication.pdfViewer.annotationEditorParams = evt;
  }
  function webViewerPrint() {
    PDFViewerApplication.triggerPrinting();
  }
  function webViewerDownload() {
    PDFViewerApplication.downloadOrSave();
  }
  function webViewerFirstPage() {
    if (PDFViewerApplication.pdfDocument) {
      PDFViewerApplication.page = 1;
    }
  }
  function webViewerLastPage() {
    if (PDFViewerApplication.pdfDocument) {
      PDFViewerApplication.page = PDFViewerApplication.pagesCount;
    }
  }
  function webViewerNextPage() {
    PDFViewerApplication.pdfViewer.nextPage();
  }
  function webViewerPreviousPage() {
    PDFViewerApplication.pdfViewer.previousPage();
  }
  function webViewerZoomIn() {
    PDFViewerApplication.zoomIn();
  }
  function webViewerZoomOut() {
    PDFViewerApplication.zoomOut();
  }
  function webViewerZoomReset() {
    PDFViewerApplication.zoomReset();
  }
  function webViewerPageNumberChanged(evt) {
    const pdfViewer = PDFViewerApplication.pdfViewer;
    // Note that for `<input type="number">` HTML elements, an empty string will
    // be returned for non-number inputs; hence we simply do nothing in that case.
    if (evt.value !== "") {
      PDFViewerApplication.pdfLinkService.goToPage(evt.value);
    }

    // Ensure that the page number input displays the correct value, even if the
    // value entered by the user was invalid (e.g. a floating point number).
    if (
      evt.value !== pdfViewer.currentPageNumber.toString() &&
      evt.value !== pdfViewer.currentPageLabel
    ) {
      PDFViewerApplication.toolbar.setPageNumber(
        pdfViewer.currentPageNumber,
        pdfViewer.currentPageLabel
      );
    }
  }
  function webViewerScaleChanged(evt) {
    PDFViewerApplication.pdfViewer.currentScaleValue = evt.value;
  }
  function webViewerRotateCw() {
    PDFViewerApplication.rotatePages(90);
  }
  function webViewerRotateCcw() {
    PDFViewerApplication.rotatePages(-90);
  }
  function webViewerOptionalContentConfig(evt) {
    PDFViewerApplication.pdfViewer.optionalContentConfigPromise = evt.promise;
  }
  function webViewerSwitchScrollMode(evt) {
    PDFViewerApplication.pdfViewer.scrollMode = evt.mode;
  }
  function webViewerSwitchSpreadMode(evt) {
    PDFViewerApplication.pdfViewer.spreadMode = evt.mode;
  }
  function webViewerDocumentProperties() {
    PDFViewerApplication.pdfDocumentProperties.open();
  }

  function webViewerFindFromUrlHash(evt) {
    PDFViewerApplication.eventBus.dispatch("find", {
      source: evt.source,
      type: "",
      query: evt.query,
      phraseSearch: evt.phraseSearch,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
      matchDiacritics: true,
    });
  }

  function webViewerUpdateFindMatchesCount({ matchesCount }) {
    if (PDFViewerApplication.supportsIntegratedFind) {
      PDFViewerApplication.externalServices.updateFindMatchesCount(matchesCount);
    } else {
      PDFViewerApplication.findBar.updateResultsCount(matchesCount);
    }
  }

  function webViewerUpdateFindControlState({
                                             state,
                                             previous,
                                             matchesCount,
                                             rawQuery,
                                           }) {
    if (PDFViewerApplication.supportsIntegratedFind) {
      PDFViewerApplication.externalServices.updateFindControlState({
        result: state,
        findPrevious: previous,
        matchesCount,
        rawQuery,
      });
    } else {
      PDFViewerApplication.findBar.updateUIState(state, previous, matchesCount);
    }
  }

  function webViewerScaleChanging(evt) {
    PDFViewerApplication.toolbar.setPageScale(evt.presetValue, evt.scale);

    PDFViewerApplication.pdfViewer.update();
  }

  function webViewerRotationChanging(evt) {
    PDFViewerApplication.pdfThumbnailViewer.pagesRotation = evt.pagesRotation;

    PDFViewerApplication.forceRendering();
    // Ensure that the active page doesn't change during rotation.
    PDFViewerApplication.pdfViewer.currentPageNumber = evt.pageNumber;
  }

  function webViewerPageChanging({ pageNumber, pageLabel }) {
    PDFViewerApplication.toolbar.setPageNumber(pageNumber, pageLabel);
    PDFViewerApplication.secondaryToolbar.setPageNumber(pageNumber);

    if (PDFViewerApplication.pdfSidebar.visibleView === SidebarView.THUMBS) {
      PDFViewerApplication.pdfThumbnailViewer.scrollThumbnailIntoView(pageNumber);
    }
  }

  function webViewerResolutionChange(evt) {
    PDFViewerApplication.pdfViewer.refresh();
  }


  function webViewerVisibilityChange(evt) {
    if (document.visibilityState === "visible") {
      // Ignore mouse wheel zooming during tab switches (bug 1503412).
      setZoomDisabledTimeout();
    }
  }

  let zoomDisabledTimeout = null;
  function setZoomDisabledTimeout() {
    if (zoomDisabledTimeout) {
      clearTimeout(zoomDisabledTimeout);
    }
    zoomDisabledTimeout = setTimeout(function () {
      zoomDisabledTimeout = null;
    }, WHEEL_ZOOM_DISABLED_TIMEOUT);
  }

  function webViewerWheel(evt) {
    const { pdfViewer, supportedMouseWheelZoomModifierKeys } =
      PDFViewerApplication;

    if (pdfViewer.isInPresentationMode) {
      return;
    }

    if (
      (evt.ctrlKey && supportedMouseWheelZoomModifierKeys.ctrlKey) ||
      (evt.metaKey && supportedMouseWheelZoomModifierKeys.metaKey)
    ) {
      // Only zoom the pages, not the entire viewer.
      evt.preventDefault();
      // NOTE: this check must be placed *after* preventDefault.
      if (zoomDisabledTimeout || document.visibilityState === "hidden") {
        return;
      }

      // It is important that we query deltaMode before delta{X,Y}, so that
      // Firefox doesn't switch to DOM_DELTA_PIXEL mode for compat with other
      // browsers, see https://bugzilla.mozilla.org/show_bug.cgi?id=1392460.
      const deltaMode = evt.deltaMode;
      const delta = normalizeWheelEventDirection(evt);
      const previousScale = pdfViewer.currentScale;

      let ticks = 0;
      if (
        deltaMode === WheelEvent.DOM_DELTA_LINE ||
        deltaMode === WheelEvent.DOM_DELTA_PAGE
      ) {
        // For line-based devices, use one tick per event, because different
        // OSs have different defaults for the number lines. But we generally
        // want one "clicky" roll of the wheel (which produces one event) to
        // adjust the zoom by one step.
        if (Math.abs(delta) >= 1) {
          ticks = Math.sign(delta);
        } else {
          // If we're getting fractional lines (I can't think of a scenario
          // this might actually happen), be safe and use the accumulator.
          ticks = PDFViewerApplication.accumulateWheelTicks(delta);
        }
      } else {
        // pixel-based devices
        const PIXELS_PER_LINE_SCALE = 30;
        ticks = PDFViewerApplication.accumulateWheelTicks(
          delta / PIXELS_PER_LINE_SCALE
        );
      }

      if (ticks < 0) {
        PDFViewerApplication.zoomOut(-ticks);
      } else if (ticks > 0) {
        PDFViewerApplication.zoomIn(ticks);
      }

      const currentScale = pdfViewer.currentScale;
      if (previousScale !== currentScale) {
        // After scaling the page via zoomIn/zoomOut, the position of the upper-
        // left corner is restored. When the mouse wheel is used, the position
        // under the cursor should be restored instead.
        const scaleCorrectionFactor = currentScale / previousScale - 1;
        const rect = pdfViewer.container.getBoundingClientRect();
        const dx = evt.clientX - rect.left;
        const dy = evt.clientY - rect.top;
        pdfViewer.container.scrollLeft += dx * scaleCorrectionFactor;
        pdfViewer.container.scrollTop += dy * scaleCorrectionFactor;
      }
    } else {
      setZoomDisabledTimeout();
    }
  }

  function webViewerTouchStart(evt) {
    if (evt.touches.length > 1) {
      // Disable touch-based zooming, because the entire UI bits gets zoomed and
      // that doesn't look great. If we do want to have a good touch-based
      // zooming experience, we need to implement smooth zoom capability (probably
      // using a CSS transform for faster visual response, followed by async
      // re-rendering at the final zoom level) and do gesture detection on the
      // touchmove events to drive it. Or if we want to settle for a less good
      // experience we can make the touchmove events drive the existing step-zoom
      // behaviour that the ctrl+mousewheel path takes.
      evt.preventDefault();
    }
  }

  function webViewerClick(evt) {
    if (!PDFViewerApplication.secondaryToolbar.isOpen) {
      return;
    }
    const appConfig = PDFViewerApplication.appConfig;
    if (
      PDFViewerApplication.pdfViewer.containsElement(evt.target) ||
      (appConfig.toolbar.container.contains(evt.target) &&
        evt.target !== appConfig.secondaryToolbar.toggleButton)
    ) {
      PDFViewerApplication.secondaryToolbar.close();
    }
  }

  function webViewerKeyDown(evt) {
    if (PDFViewerApplication.overlayManager.active) {
      return;
    }
    const { eventBus, pdfViewer } = PDFViewerApplication;
    const isViewerInPresentationMode = pdfViewer.isInPresentationMode;

    let handled = false,
      ensureViewerFocused = false;
    const cmd =
      (evt.ctrlKey ? 1 : 0) |
      (evt.altKey ? 2 : 0) |
      (evt.shiftKey ? 4 : 0) |
      (evt.metaKey ? 8 : 0);

    // First, handle the key bindings that are independent whether an input
    // control is selected or not.
    if (cmd === 1 || cmd === 8 || cmd === 5 || cmd === 12) {
      // either CTRL or META key with optional SHIFT.
      switch (evt.keyCode) {
        case 70: // f
          if (!PDFViewerApplication.supportsIntegratedFind && !evt.shiftKey) {
            PDFViewerApplication.findBar.open();
            handled = true;
          }
          break;
        case 71: // g
          if (!PDFViewerApplication.supportsIntegratedFind) {
            const { state } = PDFViewerApplication.findController;
            if (state) {
              const eventState = Object.assign(Object.create(null), state, {
                source: window,
                type: "again",
                findPrevious: cmd === 5 || cmd === 12,
              });
              eventBus.dispatch("find", eventState);
            }
            handled = true;
          }
          break;
        case 61: // FF/Mac '='
        case 107: // FF '+' and '='
        case 187: // Chrome '+'
        case 171: // FF with German keyboard
          if (!isViewerInPresentationMode) {
            PDFViewerApplication.zoomIn();
          }
          handled = true;
          break;
        case 173: // FF/Mac '-'
        case 109: // FF '-'
        case 189: // Chrome '-'
          if (!isViewerInPresentationMode) {
            PDFViewerApplication.zoomOut();
          }
          handled = true;
          break;
        case 48: // '0'
        case 96: // '0' on Numpad of Swedish keyboard
          if (!isViewerInPresentationMode) {
            // keeping it unhandled (to restore page zoom to 100%)
            setTimeout(function () {
              // ... and resetting the scale after browser adjusts its scale
              PDFViewerApplication.zoomReset();
            });
            handled = false;
          }
          break;

        case 38: // up arrow
          if (isViewerInPresentationMode || PDFViewerApplication.page > 1) {
            PDFViewerApplication.page = 1;
            handled = true;
            ensureViewerFocused = true;
          }
          break;
        case 40: // down arrow
          if (
            isViewerInPresentationMode ||
            PDFViewerApplication.page < PDFViewerApplication.pagesCount
          ) {
            PDFViewerApplication.page = PDFViewerApplication.pagesCount;
            handled = true;
            ensureViewerFocused = true;
          }
          break;
      }
    }

    if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC || CHROME")) {
      // CTRL or META without shift
      if (cmd === 1 || cmd === 8) {
        switch (evt.keyCode) {
          case 83: // s
            eventBus.dispatch("download", { source: window });
            handled = true;
            break;

          case 79: // o
            if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
              eventBus.dispatch("openfile", { source: window });
              handled = true;
            }
            break;
        }
      }
    }

    // CTRL+ALT or Option+Command
    if (cmd === 3 || cmd === 10) {
      switch (evt.keyCode) {
        case 80: // p
          PDFViewerApplication.requestPresentationMode();
          handled = true;
          break;
        case 71: // g
          // focuses input#pageNumber field
          PDFViewerApplication.appConfig.toolbar.pageNumber.select();
          handled = true;
          break;
      }
    }

    if (handled) {
      if (ensureViewerFocused && !isViewerInPresentationMode) {
        pdfViewer.focus();
      }
      evt.preventDefault();
      return;
    }

    // Some shortcuts should not get handled if a control/input element
    // is selected.
    const curElement = getActiveOrFocusedElement();
    const curElementTagName = curElement?.tagName.toUpperCase();
    if (
      curElementTagName === "INPUT" ||
      curElementTagName === "TEXTAREA" ||
      curElementTagName === "SELECT" ||
      curElement?.isContentEditable
    ) {
      // Make sure that the secondary toolbar is closed when Escape is pressed.
      if (evt.keyCode !== /* Esc = */ 27) {
        return;
      }
    }

    // No control key pressed at all.
    if (cmd === 0) {
      let turnPage = 0,
        turnOnlyIfPageFit = false;
      switch (evt.keyCode) {
        case 38: // up arrow
        case 33: // pg up
          // vertical scrolling using arrow/pg keys
          if (pdfViewer.isVerticalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
          turnPage = -1;
          break;
        case 8: // backspace
          if (!isViewerInPresentationMode) {
            turnOnlyIfPageFit = true;
          }
          turnPage = -1;
          break;
        case 37: // left arrow
          // horizontal scrolling using arrow keys
          if (pdfViewer.isHorizontalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
        /* falls through */
        case 75: // 'k'
        case 80: // 'p'
          turnPage = -1;
          break;
        case 27: // esc key
          if (PDFViewerApplication.secondaryToolbar.isOpen) {
            PDFViewerApplication.secondaryToolbar.close();
            handled = true;
          }
          if (
            !PDFViewerApplication.supportsIntegratedFind &&
            PDFViewerApplication.findBar.opened
          ) {
            PDFViewerApplication.findBar.close();
            handled = true;
          }
          break;
        case 40: // down arrow
        case 34: // pg down
          // vertical scrolling using arrow/pg keys
          if (pdfViewer.isVerticalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
          turnPage = 1;
          break;
        case 13: // enter key
        case 32: // spacebar
          if (!isViewerInPresentationMode) {
            turnOnlyIfPageFit = true;
          }
          turnPage = 1;
          break;
        case 39: // right arrow
          // horizontal scrolling using arrow keys
          if (pdfViewer.isHorizontalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
        /* falls through */
        case 74: // 'j'
        case 78: // 'n'
          turnPage = 1;
          break;

        case 36: // home
          if (isViewerInPresentationMode || PDFViewerApplication.page > 1) {
            PDFViewerApplication.page = 1;
            handled = true;
            ensureViewerFocused = true;
          }
          break;
        case 35: // end
          if (
            isViewerInPresentationMode ||
            PDFViewerApplication.page < PDFViewerApplication.pagesCount
          ) {
            PDFViewerApplication.page = PDFViewerApplication.pagesCount;
            handled = true;
            ensureViewerFocused = true;
          }
          break;

        case 83: // 's'
          PDFViewerApplication.pdfCursorTools.switchTool(CursorTool.SELECT);
          break;
        case 72: // 'h'
          PDFViewerApplication.pdfCursorTools.switchTool(CursorTool.HAND);
          break;

        case 82: // 'r'
          PDFViewerApplication.rotatePages(90);
          break;

        case 115: // F4
          PDFViewerApplication.pdfSidebar.toggle();
          break;
      }

      if (
        turnPage !== 0 &&
        (!turnOnlyIfPageFit || pdfViewer.currentScaleValue === "page-fit")
      ) {
        if (turnPage > 0) {
          pdfViewer.nextPage();
        } else {
          pdfViewer.previousPage();
        }
        handled = true;
      }
    }

    // shift-key
    if (cmd === 4) {
      switch (evt.keyCode) {
        case 13: // enter key
        case 32: // spacebar
          if (
            !isViewerInPresentationMode &&
            pdfViewer.currentScaleValue !== "page-fit"
          ) {
            break;
          }
          pdfViewer.previousPage();

          handled = true;
          break;

        case 82: // 'r'
          PDFViewerApplication.rotatePages(-90);
          break;
      }
    }

    if (!handled && !isViewerInPresentationMode) {
      // 33=Page Up  34=Page Down  35=End    36=Home
      // 37=Left     38=Up         39=Right  40=Down
      // 32=Spacebar
      if (
        (evt.keyCode >= 33 && evt.keyCode <= 40) ||
        (evt.keyCode === 32 && curElementTagName !== "BUTTON")
      ) {
        ensureViewerFocused = true;
      }
    }

    if (ensureViewerFocused && !pdfViewer.containsElement(curElement)) {
      // The page container is not focused, but a page navigation key has been
      // pressed. Change the focus to the viewer container to make sure that
      // navigation by keyboard works as expected.
      pdfViewer.focus();
    }

    if (handled) {
      evt.preventDefault();
    }
  }

  function beforeUnload(evt) {
    evt.preventDefault();
    evt.returnValue = "";
    return false;
  }

  function webViewerAnnotationEditorStatesChanged(data) {
    PDFViewerApplication.externalServices.updateEditorStates(data);
  }

  return {
    validateFileURL,
    loadFakeWorker,
    loadPDFBug,
    reportPageStatsPDFBug,
    webViewerInitialized,
    webViewerPageRendered,
    webViewerPageMode,
    webViewerNamedAction,
    webViewerPresentationModeChanged,
    webViewerSidebarViewChanged,
    webViewerUpdateViewarea,
    webViewerScrollModeChanged,
    webViewerSpreadModeChanged,
    webViewerResize,
    webViewerHashchange,
    webViewerFileInputChange,
    webViewerOpenFile,
    webViewerPresentationMode,
    webViewerPrint,
    webViewerDownload,
    webViewerFirstPage,
    webViewerLastPage,
    webViewerNextPage,
    webViewerPreviousPage,
    webViewerZoomIn,
    webViewerZoomOut,
    webViewerZoomReset,
    webViewerPageNumberChanged,
    webViewerScaleChanged,
    webViewerRotateCw,
    webViewerRotateCcw,
    webViewerOptionalContentConfig,
    webViewerSwitchScrollMode,
    webViewerSwitchSpreadMode,
    webViewerDocumentProperties,
    webViewerFindFromUrlHash,
    webViewerUpdateFindMatchesCount,
    webViewerUpdateFindControlState,
    webViewerScaleChanging,
    webViewerRotationChanging,
    webViewerPageChanging,
    webViewerVisibilityChange,
    webViewerWheel,
    webViewerTouchStart,
    webViewerClick,
    webViewerKeyDown,
    beforeUnload,
    webViewerSwitchAnnotationEditorMode,
    webViewerSwitchAnnotationEditorParams,
    webViewerResolutionChange,
    webViewerAnnotationEditorStatesChanged,
  }
}

export {
  createHelper,
}