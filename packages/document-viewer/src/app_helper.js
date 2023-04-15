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

  if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
    const HOSTED_VIEWER_ORIGINS = [
      "null",
      "http://mozilla.github.io",
      "https://mozilla.github.io",
    ];
    // eslint-disable-next-line no-var
    var validateFileURL = function (file) {
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
      appConfig.toolbar?.print.classList.add("hidden");
      appConfig.secondaryToolbar?.printButton.classList.add("hidden");
    }

    if (!PDFViewerApplication.supportsFullscreen) {
      appConfig.secondaryToolbar?.presentationModeButton.classList.add("hidden");
    }

    if (PDFViewerApplication.supportsIntegratedFind) {
      appConfig.toolbar?.viewFind.classList.add("hidden");
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
          if (typeof file === "string" || file instanceof URL) {
            PDFViewerApplication.open({url: file});
          } else if (file.byteLength) {
            PDFViewerApplication.open({data: file});
          }
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

  function webViewerPageRender({ pageNumber }) {
    // If the page is (the most) visible when it starts rendering,
    // ensure that the page number input loading indicator is displayed.
    if (pageNumber === PDFViewerApplication.page) {
      PDFViewerApplication.toolbar?.updateLoadingIndicatorState(true);
    }
  }

  function webViewerPageRendered({ pageNumber, error }) {
    // If the page is still visible when it has finished rendering,
    // ensure that the page number input loading indicator is hidden.
    if (pageNumber === PDFViewerApplication.page) {
      PDFViewerApplication.toolbar?.updateLoadingIndicatorState(false);
    }

    // Use the rendered page to set the corresponding thumbnail image.
    if (PDFViewerApplication.pdfSidebar?.visibleView === SidebarView.THUMBS) {
      const pageView = PDFViewerApplication.pdfViewer.getPageView(
        /* index = */ pageNumber - 1
      );
      const thumbnailView = PDFViewerApplication.pdfThumbnailViewer?.getThumbnail(
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
    PDFViewerApplication.pdfSidebar?.switchView(view, /* forceOpen = */ true);
  }

  function webViewerNamedAction(evt) {
    // Processing a couple of named actions that might be useful, see also
    // `PDFLinkService.executeNamedAction`.
    switch (evt.action) {
      case "GoToPage":
        PDFViewerApplication.appConfig.toolbar?.pageNumber.select();
        break;

      case "Find":
        if (!PDFViewerApplication.supportsIntegratedFind) {
          PDFViewerApplication.findBar?.toggle();
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
    if (PDFViewerApplication.appConfig.secondaryToolbar) {
      const href = PDFViewerApplication.pdfLinkService.getAnchorUrl(
        location.pdfOpenParams
      );
      PDFViewerApplication.appConfig.secondaryToolbar.viewBookmarkButton.href =
        href;
    }
  }

  function webViewerScrollModeChanged(evt) {
    if (
      PDFViewerApplication.isInitialViewSet &&
      !PDFViewerApplication.pdfViewer.isInPresentationMode
    ) {
      // Only update the storage when the document has been loaded *and* rendered.
      PDFViewerApplication.store?.set("scrollMode", evt.mode).catch(() => {
        // Unable to write to storage.
      });
    }
  }

  function webViewerSpreadModeChanged(evt) {
    if (
      PDFViewerApplication.isInitialViewSet &&
      !PDFViewerApplication.pdfViewer.isInPresentationMode
    ) {
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

      PDFViewerApplication.open({
        url: URL.createObjectURL(file),
        originalUrl: file.name,
      });
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
      PDFViewerApplication.toolbar?.setPageNumber(
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
    PDFViewerApplication.pdfDocumentProperties?.open();
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
      PDFViewerApplication.findBar?.updateUIState(state, previous, matchesCount);
    }
  }

  function webViewerScaleChanging(evt) {
    PDFViewerApplication.toolbar?.setPageScale(evt.presetValue, evt.scale);

    PDFViewerApplication.pdfViewer.update();
  }

  function webViewerRotationChanging(evt) {
    if (PDFViewerApplication.pdfThumbnailViewer) {
      PDFViewerApplication.pdfThumbnailViewer.pagesRotation = evt.pagesRotation;
    }

    PDFViewerApplication.forceRendering();
    // Ensure that the active page doesn't change during rotation.
    PDFViewerApplication.pdfViewer.currentPageNumber = evt.pageNumber;
  }

  function webViewerPageChanging({ pageNumber, pageLabel }) {
    PDFViewerApplication.toolbar?.setPageNumber(pageNumber, pageLabel);
    PDFViewerApplication.secondaryToolbar?.setPageNumber(pageNumber);

    if (PDFViewerApplication.pdfSidebar?.visibleView === SidebarView.THUMBS) {
      PDFViewerApplication.pdfThumbnailViewer?.scrollThumbnailIntoView(
        pageNumber
      );
    }

    // Show/hide the loading indicator in the page number input element.
    const currentPage = PDFViewerApplication.pdfViewer.getPageView(
      /* index = */ pageNumber - 1
    );
    PDFViewerApplication.toolbar?.updateLoadingIndicatorState(
      currentPage?.renderingState === RenderingStates.RUNNING
    );
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
    const {
      pdfViewer,
      supportedMouseWheelZoomModifierKeys,
      supportsPinchToZoom,
    } = PDFViewerApplication;

    if (pdfViewer.isInPresentationMode) {
      return;
    }

    // Pinch-to-zoom on a trackpad maps to a wheel event with ctrlKey set to true
    // https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent#browser_compatibility
    // Hence if ctrlKey is true but ctrl key hasn't been pressed then we can
    // infer that we have a pinch-to-zoom.
    // But the ctrlKey could have been pressed outside of the browser window,
    // hence we try to do some magic to guess if the scaleFactor is likely coming
    // from a pinch-to-zoom or not.

    // It is important that we query deltaMode before delta{X,Y}, so that
    // Firefox doesn't switch to DOM_DELTA_PIXEL mode for compat with other
    // browsers, see https://bugzilla.mozilla.org/show_bug.cgi?id=1392460.
    const deltaMode = evt.deltaMode;

    // The following formula is a bit strange but it comes from:
    // https://searchfox.org/mozilla-central/rev/d62c4c4d5547064487006a1506287da394b64724/widget/InputData.cpp#618-626
    let scaleFactor = Math.exp(-evt.deltaY / 100);

    const isPinchToZoom =
      evt.ctrlKey &&
      !PDFViewerApplication._isCtrlKeyDown &&
      deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
      evt.deltaX === 0 &&
      Math.abs(scaleFactor - 1) < 0.05 &&
      evt.deltaZ === 0;

    if (
      isPinchToZoom ||
      (evt.ctrlKey && supportedMouseWheelZoomModifierKeys.ctrlKey) ||
      (evt.metaKey && supportedMouseWheelZoomModifierKeys.metaKey)
    ) {
      // Only zoom the pages, not the entire viewer.
      evt.preventDefault();
      // NOTE: this check must be placed *after* preventDefault.
      if (zoomDisabledTimeout || document.visibilityState === "hidden") {
        return;
      }

      const previousScale = pdfViewer.currentScale;
      if (isPinchToZoom && supportsPinchToZoom) {
        scaleFactor = PDFViewerApplication._accumulateFactor(
          previousScale,
          scaleFactor,
          "_wheelUnusedFactor"
        );
        if (scaleFactor < 1) {
          PDFViewerApplication.zoomOut(null, scaleFactor);
        } else if (scaleFactor > 1) {
          PDFViewerApplication.zoomIn(null, scaleFactor);
        } else {
          return;
        }
      } else {
        const delta = normalizeWheelEventDirection(evt);

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
            ticks = PDFViewerApplication._accumulateTicks(
              delta,
              "_wheelUnusedTicks"
            );
          }
        } else {
          // pixel-based devices
          const PIXELS_PER_LINE_SCALE = 30;
          ticks = PDFViewerApplication._accumulateTicks(
            delta / PIXELS_PER_LINE_SCALE,
            "_wheelUnusedTicks"
          );
        }

        if (ticks < 0) {
          PDFViewerApplication.zoomOut(-ticks);
        } else if (ticks > 0) {
          PDFViewerApplication.zoomIn(ticks);
        } else {
          return;
        }
      }

      // After scaling the page via zoomIn/zoomOut, the position of the upper-
      // left corner is restored. When the mouse wheel is used, the position
      // under the cursor should be restored instead.
      PDFViewerApplication._centerAtPos(previousScale, evt.clientX, evt.clientY);
    } else {
      setZoomDisabledTimeout();
    }
  }

  function webViewerTouchStart(evt) {
    if (
      PDFViewerApplication.pdfViewer.isInPresentationMode ||
      evt.touches.length < 2
    ) {
      return;
    }
    evt.preventDefault();

    if (evt.touches.length !== 2) {
      PDFViewerApplication._touchInfo = null;
      return;
    }

    let [touch0, touch1] = evt.touches;
    if (touch0.identifier > touch1.identifier) {
      [touch0, touch1] = [touch1, touch0];
    }
    PDFViewerApplication._touchInfo = {
      touch0X: touch0.pageX,
      touch0Y: touch0.pageY,
      touch1X: touch1.pageX,
      touch1Y: touch1.pageY,
    };
  }

  function webViewerTouchMove(evt) {
    if (!PDFViewerApplication._touchInfo || evt.touches.length !== 2) {
      return;
    }

    const { pdfViewer, _touchInfo, supportsPinchToZoom } = PDFViewerApplication;
    let [touch0, touch1] = evt.touches;
    if (touch0.identifier > touch1.identifier) {
      [touch0, touch1] = [touch1, touch0];
    }
    const { pageX: page0X, pageY: page0Y } = touch0;
    const { pageX: page1X, pageY: page1Y } = touch1;
    const {
      touch0X: pTouch0X,
      touch0Y: pTouch0Y,
      touch1X: pTouch1X,
      touch1Y: pTouch1Y,
    } = _touchInfo;

    if (
      Math.abs(pTouch0X - page0X) <= 1 &&
      Math.abs(pTouch0Y - page0Y) <= 1 &&
      Math.abs(pTouch1X - page1X) <= 1 &&
      Math.abs(pTouch1Y - page1Y) <= 1
    ) {
      // Touches are really too close and it's hard do some basic
      // geometry in order to guess something.
      return;
    }

    _touchInfo.touch0X = page0X;
    _touchInfo.touch0Y = page0Y;
    _touchInfo.touch1X = page1X;
    _touchInfo.touch1Y = page1Y;

    if (pTouch0X === page0X && pTouch0Y === page0Y) {
      // First touch is fixed, if the vectors are collinear then we've a pinch.
      const v1X = pTouch1X - page0X;
      const v1Y = pTouch1Y - page0Y;
      const v2X = page1X - page0X;
      const v2Y = page1Y - page0Y;
      const det = v1X * v2Y - v1Y * v2X;
      // 0.02 is approximatively sin(0.15deg).
      if (Math.abs(det) > 0.02 * Math.hypot(v1X, v1Y) * Math.hypot(v2X, v2Y)) {
        return;
      }
    } else if (pTouch1X === page1X && pTouch1Y === page1Y) {
      // Second touch is fixed, if the vectors are collinear then we've a pinch.
      const v1X = pTouch0X - page1X;
      const v1Y = pTouch0Y - page1Y;
      const v2X = page0X - page1X;
      const v2Y = page0Y - page1Y;
      const det = v1X * v2Y - v1Y * v2X;
      if (Math.abs(det) > 0.02 * Math.hypot(v1X, v1Y) * Math.hypot(v2X, v2Y)) {
        return;
      }
    } else {
      const diff0X = page0X - pTouch0X;
      const diff1X = page1X - pTouch1X;
      const diff0Y = page0Y - pTouch0Y;
      const diff1Y = page1Y - pTouch1Y;
      const dotProduct = diff0X * diff1X + diff0Y * diff1Y;
      if (dotProduct >= 0) {
        // The two touches go in almost the same direction.
        return;
      }
    }

    evt.preventDefault();

    const distance = Math.hypot(page0X - page1X, page0Y - page1Y) || 1;
    const pDistance = Math.hypot(pTouch0X - pTouch1X, pTouch0Y - pTouch1Y) || 1;
    const previousScale = pdfViewer.currentScale;
    if (supportsPinchToZoom) {
      const newScaleFactor = PDFViewerApplication._accumulateFactor(
        previousScale,
        distance / pDistance,
        "_touchUnusedFactor"
      );
      if (newScaleFactor < 1) {
        PDFViewerApplication.zoomOut(null, newScaleFactor);
      } else if (newScaleFactor > 1) {
        PDFViewerApplication.zoomIn(null, newScaleFactor);
      } else {
        return;
      }
    } else {
      const PIXELS_PER_LINE_SCALE = 30;
      const ticks = PDFViewerApplication._accumulateTicks(
        (distance - pDistance) / PIXELS_PER_LINE_SCALE,
        "_touchUnusedTicks"
      );
      if (ticks < 0) {
        PDFViewerApplication.zoomOut(-ticks);
      } else if (ticks > 0) {
        PDFViewerApplication.zoomIn(ticks);
      } else {
        return;
      }
    }

    PDFViewerApplication._centerAtPos(
      previousScale,
      (page0X + page1X) / 2,
      (page0Y + page1Y) / 2
    );
  }

  function webViewerTouchEnd(evt) {
    if (!PDFViewerApplication._touchInfo) {
      return;
    }

    evt.preventDefault();
    PDFViewerApplication._touchInfo = null;
    PDFViewerApplication._touchUnusedTicks = 0;
    PDFViewerApplication._touchUnusedFactor = 1;
  }

  function webViewerClick(evt) {
    if (!PDFViewerApplication.secondaryToolbar?.isOpen) {
      return;
    }
    const appConfig = PDFViewerApplication.appConfig;
    if (
      PDFViewerApplication.pdfViewer.containsElement(evt.target) ||
      (appConfig.toolbar?.container.contains(evt.target) &&
        evt.target !== appConfig.secondaryToolbar?.toggleButton)
    ) {
      PDFViewerApplication.secondaryToolbar.close();
    }
  }

  function webViewerKeyUp(evt) {
    // evt.ctrlKey is false hence we use evt.key.
    if (evt.key === "Control") {
      PDFViewerApplication._isCtrlKeyDown = false;
    }
  }

  function webViewerKeyDown(evt) {
    PDFViewerApplication._isCtrlKeyDown = evt.key === "Control";

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
            PDFViewerApplication.findBar?.open();
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
          PDFViewerApplication.externalServices.reportTelemetry({
            type: "buttons",
            data: { id: "presentationModeKeyboard" },
          });
          break;
        case 71: // g
          // focuses input#pageNumber field
          if (PDFViewerApplication.appConfig.toolbar) {
            PDFViewerApplication.appConfig.toolbar.pageNumber.select();
            handled = true;
          }
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
          if (PDFViewerApplication.secondaryToolbar?.isOpen) {
            PDFViewerApplication.secondaryToolbar.close();
            handled = true;
          }
          if (
            !PDFViewerApplication.supportsIntegratedFind &&
            PDFViewerApplication.findBar?.opened
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
          PDFViewerApplication.pdfCursorTools?.switchTool(CursorTool.SELECT);
          break;
        case 72: // 'h'
          PDFViewerApplication.pdfCursorTools?.switchTool(CursorTool.HAND);
          break;

        case 82: // 'r'
          PDFViewerApplication.rotatePages(90);
          break;

        case 115: // F4
          PDFViewerApplication.pdfSidebar?.toggle();
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
    webViewerPageRender,
  }
}

export {
  createHelper,
}
