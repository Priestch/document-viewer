import {
  animationStarted,
  apiPageLayoutToViewerModes,
  apiPageModeToSidebarView,
  AutoPrintRegExp,
  CursorTool,
  DEFAULT_SCALE_VALUE,
  getActiveOrFocusedElement,
  isValidRotation,
  isValidScrollMode,
  isValidSpreadMode,
  normalizeWheelEventDirection,
  parseQueryString,
  ProgressBar,
  RenderingStates,
  ScrollMode,
  SidebarView,
  SpreadMode,
  TextLayerMode,
} from "./ui_utils.js";
import {
  AnnotationEditorType,
  build,
  FeatureTest,
  getDocument,
  getFilenameFromUrl,
  getPdfFilenameFromUrl,
  GlobalWorkerOptions,
  InvalidPDFException,
  isDataScheme,
  isPdfFile,
  loadScript,
  MissingPDFException,
  PDFWorker,
  PromiseCapability,
  shadow,
  UnexpectedResponseException,
  version,
} from "pdfjs-lib";
import { AppOptions, OptionKind } from "./app_options.js";
import { AutomationEventBus, EventBus } from "./event_utils.js";
import { LinkTarget, PDFLinkService } from "./pdf_link_service.js";
import { AltTextManager } from "web-alt_text_manager";
import { AnnotationEditorParams } from "web-annotation_editor_params";
import { OverlayManager } from "./overlay_manager.js";
import { PasswordPrompt } from "./password_prompt.js";
import { PDFAttachmentViewer } from "web-pdf_attachment_viewer";
import { PDFCursorTools } from "web-pdf_cursor_tools";
import { PDFDocumentProperties } from "web-pdf_document_properties";
import { PDFFindBar } from "web-pdf_find_bar";
import { PDFFindController } from "./pdf_find_controller.js";
import { PDFHistory } from "./pdf_history.js";
import { PDFLayerViewer } from "web-pdf_layer_viewer";
import { PDFOutlineViewer } from "web-pdf_outline_viewer";
import { PDFPresentationMode } from "web-pdf_presentation_mode";
import { PDFRenderingQueue } from "./pdf_rendering_queue.js";
import { PDFScriptingManager } from "./pdf_scripting_manager.js";
import { PDFSidebar } from "web-pdf_sidebar";
import { PDFThumbnailViewer } from "web-pdf_thumbnail_viewer";
import { PDFViewer } from "./pdf_viewer.js";
import { SecondaryToolbar } from "web-secondary_toolbar";
import { Toolbar } from "web-toolbar";
import { ViewHistory } from "./view_history.js";
function createHelper(PDFViewerApplication) {
  const { AppOptions } = PDFViewerApplication;
  if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
    const HOSTED_VIEWER_ORIGINS = [
      "null",
      "http://mozilla.github.io",
      "https://mozilla.github.io",
    ];
    var validateFileURL = function (file) {
      if (!file) {
        return;
      }
      try {
        const viewerOrigin = new URL(window.location.href).origin || "null";
        if (HOSTED_VIEWER_ORIGINS.includes(viewerOrigin)) {
          return;
        }
        const fileOrigin = new URL(file, window.location.href).origin;
        if (fileOrigin !== viewerOrigin) {
          throw new Error("file origin does not match viewer's");
        }
      } catch (ex) {
        PDFViewerApplication.l10n.get("loading_error").then((msg) => {
          PDFViewerApplication._documentError(msg, { message: ex?.message });
        });
        throw ex;
      }
    };
  }
  async function loadFakeWorker() {
    GlobalWorkerOptions.workerSrc ||= AppOptions.get("workerSrc");
    if (typeof PDFJSDev === "undefined") {
      window.pdfjsWorker = await import("pdfjs/pdf.worker.js");
      return;
    }
    await loadScript(PDFWorker.workerSrc);
  }
  async function loadPDFBug(self) {
    const { debuggerScriptPath } = self.appConfig;
    const { PDFBug } =
      typeof PDFJSDev === "undefined"
        ? await import(debuggerScriptPath)
        : await __non_webpack_import__(debuggerScriptPath);
    self._PDFBug = PDFBug;
  }
  function reportPageStatsPDFBug({ pageNumber }) {
    if (!globalThis.Stats?.enabled) {
      return;
    }
    const pageView = PDFViewerApplication.pdfViewer.getPageView(pageNumber - 1);
    globalThis.Stats.add(pageNumber, pageView?.pdfPage?.stats);
  }
  function webViewerPageRender({ pageNumber }) {
    if (pageNumber === PDFViewerApplication.page) {
      PDFViewerApplication.toolbar?.updateLoadingIndicatorState(true);
    }
  }
  function webViewerPageRendered({ pageNumber, error }) {
    if (pageNumber === PDFViewerApplication.page) {
      PDFViewerApplication.toolbar?.updateLoadingIndicatorState(false);
    }
    if (PDFViewerApplication.pdfSidebar?.visibleView === SidebarView.THUMBS) {
      const pageView = PDFViewerApplication.pdfViewer.getPageView(pageNumber - 1);
      const thumbnailView = PDFViewerApplication.pdfThumbnailViewer?.getThumbnail(pageNumber - 1);
      if (pageView) {
        thumbnailView?.setImage(pageView);
      }
    }
    if (error) {
      PDFViewerApplication.l10n.get("rendering_error").then((msg) => {
        PDFViewerApplication._otherError(msg, error);
      });
    }
  }
  function webViewerPageMode({ mode }) {
    let view;
    switch (mode) {
      case "thumbs":
        view = SidebarView.THUMBS;
        break;
      case "bookmarks":
      case "outline":
        view = SidebarView.OUTLINE;
        break;
      case "attachments":
        view = SidebarView.ATTACHMENTS;
        break;
      case "layers":
        view = SidebarView.LAYERS;
        break;
      case "none":
        view = SidebarView.NONE;
        break;
      default:
        console.error('Invalid "pagemode" hash parameter: ' + mode);
        return;
    }
    PDFViewerApplication.pdfSidebar?.switchView(view, true);
  }
  function webViewerNamedAction(evt) {
    switch (evt.action) {
      case "GoToPage":
        PDFViewerApplication.appConfig.toolbar?.pageNumber.select();
        break;
      case "Find":
        if (!PDFViewerApplication.supportsIntegratedFind) {
          PDFViewerApplication?.findBar.toggle();
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
    PDFViewerApplication.pdfRenderingQueue.isThumbnailViewEnabled = view === SidebarView.THUMBS;
    if (PDFViewerApplication.isInitialViewSet) {
      PDFViewerApplication.store?.set("sidebarView", view).catch(() => {});
    }
  }
  function webViewerUpdateViewarea({ location }) {
    if (PDFViewerApplication.isInitialViewSet) {
      PDFViewerApplication.store
        ?.setMultiple({
          page: location.pageNumber,
          zoom: location.scale,
          scrollLeft: location.left,
          scrollTop: location.top,
          rotation: location.rotation,
        })
        .catch(() => {});
    }
    if (PDFViewerApplication.appConfig.secondaryToolbar) {
      const href = PDFViewerApplication.pdfLinkService.getAnchorUrl(location.pdfOpenParams);
      PDFViewerApplication.appConfig.secondaryToolbar.viewBookmarkButton.href = href;
    }
  }
  function webViewerScrollModeChanged(evt) {
    if (
      PDFViewerApplication.isInitialViewSet &&
      !PDFViewerApplication.pdfViewer.isInPresentationMode
    ) {
      PDFViewerApplication.store?.set("scrollMode", evt.mode).catch(() => {});
    }
  }
  function webViewerSpreadModeChanged(evt) {
    if (
      PDFViewerApplication.isInitialViewSet &&
      !PDFViewerApplication.pdfViewer.isInPresentationMode
    ) {
      PDFViewerApplication.store?.set("spreadMode", evt.mode).catch(() => {});
    }
  }
  function webViewerResize() {
    const { pdfDocument, pdfViewer, pdfRenderingQueue } = PDFViewerApplication;
    if (pdfRenderingQueue.printing && window.matchMedia("print").matches) {
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
    var webViewerFileInputChange = function (evt) {
      if (PDFViewerApplication.pdfViewer?.isInPresentationMode) {
        return;
      }
      const file = evt.fileInput.files[0];
      PDFViewerApplication.open({
        url: URL.createObjectURL(file),
        originalUrl: file.name,
      });
    };
    var webViewerOpenFile = function (evt) {
      const fileInput = PDFViewerApplication.appConfig.openFileInput;
      fileInput.click();
    };
  }
  function webViewerPresentationMode() {
    PDFViewerApplication.requestPresentationMode();
  }
  function webViewerSwitchAnnotationEditorMode(evt) {
    PDFViewerApplication.pdfViewer.annotationEditorMode = evt;
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
  function webViewerOpenInExternalApp() {
    PDFViewerApplication.openInExternalApp();
  }
  function webViewerFirstPage() {
    PDFViewerApplication.page = 1;
  }
  function webViewerLastPage() {
    PDFViewerApplication.page = PDFViewerApplication.pagesCount;
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
    if (evt.value !== "") {
      PDFViewerApplication.pdfLinkService.goToPage(evt.value);
    }
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
  function webViewerUpdateFindControlState({ state, previous, matchesCount, rawQuery }) {
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
    PDFViewerApplication.pdfViewer.currentPageNumber = evt.pageNumber;
  }
  function webViewerPageChanging({ pageNumber, pageLabel }) {
    PDFViewerApplication.toolbar?.setPageNumber(pageNumber, pageLabel);
    PDFViewerApplication.secondaryToolbar?.setPageNumber(pageNumber);
    if (PDFViewerApplication.pdfSidebar?.visibleView === SidebarView.THUMBS) {
      PDFViewerApplication.pdfThumbnailViewer?.scrollThumbnailIntoView(pageNumber);
    }
    const currentPage = PDFViewerApplication.pdfViewer.getPageView(pageNumber - 1);
    PDFViewerApplication.toolbar?.updateLoadingIndicatorState(
      currentPage?.renderingState === RenderingStates.RUNNING
    );
  }
  function webViewerResolutionChange(evt) {
    PDFViewerApplication.pdfViewer.refresh();
  }
  function webViewerVisibilityChange(evt) {
    if (document.visibilityState === "visible") {
      setZoomDisabledTimeout();
    }
  }
  function setZoomDisabledTimeout() {
    if (zoomDisabledTimeout) {
      clearTimeout(zoomDisabledTimeout);
    }
    zoomDisabledTimeout = setTimeout(function () {
      zoomDisabledTimeout = null;
    }, WHEEL_ZOOM_DISABLED_TIMEOUT);
  }
  function webViewerWheel(evt) {
    const { pdfViewer, supportedMouseWheelZoomModifierKeys, supportsPinchToZoom } =
      PDFViewerApplication;
    if (pdfViewer.isInPresentationMode) {
      return;
    }
    const deltaMode = evt.deltaMode;
    let scaleFactor = Math.exp(-evt.deltaY / 100);
    const isBuiltInMac =
      typeof PDFJSDev !== "undefined" && PDFJSDev.test("MOZCENTRAL") && FeatureTest.platform.isMac;
    const isPinchToZoom =
      evt.ctrlKey &&
      !PDFViewerApplication._isCtrlKeyDown &&
      deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
      evt.deltaX === 0 &&
      (Math.abs(scaleFactor - 1) < 0.05 || isBuiltInMac) &&
      evt.deltaZ === 0;
    if (
      isPinchToZoom ||
      (evt.ctrlKey && supportedMouseWheelZoomModifierKeys.ctrlKey) ||
      (evt.metaKey && supportedMouseWheelZoomModifierKeys.metaKey)
    ) {
      evt.preventDefault();
      if (
        zoomDisabledTimeout ||
        document.visibilityState === "hidden" ||
        PDFViewerApplication.overlayManager.active
      ) {
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
        if (deltaMode === WheelEvent.DOM_DELTA_LINE || deltaMode === WheelEvent.DOM_DELTA_PAGE) {
          if (Math.abs(delta) >= 1) {
            ticks = Math.sign(delta);
          } else {
            ticks = PDFViewerApplication._accumulateTicks(delta, "_wheelUnusedTicks");
          }
        } else {
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
      PDFViewerApplication._centerAtPos(previousScale, evt.clientX, evt.clientY);
    } else {
      setZoomDisabledTimeout();
    }
  }
  function webViewerTouchStart(evt) {
    if (PDFViewerApplication.pdfViewer.isInPresentationMode || evt.touches.length < 2) {
      return;
    }
    evt.preventDefault();
    if (evt.touches.length !== 2 || PDFViewerApplication.overlayManager.active) {
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
      return;
    }
    _touchInfo.touch0X = page0X;
    _touchInfo.touch0Y = page0Y;
    _touchInfo.touch1X = page1X;
    _touchInfo.touch1Y = page1Y;
    if (pTouch0X === page0X && pTouch0Y === page0Y) {
      const v1X = pTouch1X - page0X;
      const v1Y = pTouch1Y - page0Y;
      const v2X = page1X - page0X;
      const v2Y = page1Y - page0Y;
      const det = v1X * v2Y - v1Y * v2X;
      if (Math.abs(det) > 0.02 * Math.hypot(v1X, v1Y) * Math.hypot(v2X, v2Y)) {
        return;
      }
    } else if (pTouch1X === page1X && pTouch1Y === page1Y) {
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
    PDFViewerApplication._centerAtPos(previousScale, (page0X + page1X) / 2, (page0Y + page1Y) / 2);
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
    if (cmd === 1 || cmd === 8 || cmd === 5 || cmd === 12) {
      switch (evt.keyCode) {
        case 70:
          if (!PDFViewerApplication.supportsIntegratedFind && !evt.shiftKey) {
            PDFViewerApplication.findBar?.open();
            handled = true;
          }
          break;
        case 71:
          if (!PDFViewerApplication.supportsIntegratedFind) {
            const { state } = PDFViewerApplication.findController;
            if (state) {
              const newState = {
                source: window,
                type: "again",
                findPrevious: cmd === 5 || cmd === 12,
              };
              eventBus.dispatch("find", {
                ...state,
                ...newState,
              });
            }
            handled = true;
          }
          break;
        case 61:
        case 107:
        case 187:
        case 171:
          PDFViewerApplication.zoomIn();
          handled = true;
          break;
        case 173:
        case 109:
        case 189:
          PDFViewerApplication.zoomOut();
          handled = true;
          break;
        case 48:
        case 96:
          if (!isViewerInPresentationMode) {
            setTimeout(function () {
              PDFViewerApplication.zoomReset();
            });
            handled = false;
          }
          break;
        case 38:
          if (isViewerInPresentationMode || PDFViewerApplication.page > 1) {
            PDFViewerApplication.page = 1;
            handled = true;
            ensureViewerFocused = true;
          }
          break;
        case 40:
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
      if (cmd === 1 || cmd === 8) {
        switch (evt.keyCode) {
          case 83:
            eventBus.dispatch("download", { source: window });
            handled = true;
            break;
          case 79:
            if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
              eventBus.dispatch("openfile", { source: window });
              handled = true;
            }
            break;
        }
      }
    }
    if (cmd === 3 || cmd === 10) {
      switch (evt.keyCode) {
        case 80:
          PDFViewerApplication.requestPresentationMode();
          handled = true;
          PDFViewerApplication.externalServices.reportTelemetry({
            type: "buttons",
            data: { id: "presentationModeKeyboard" },
          });
          break;
        case 71:
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
    const curElement = getActiveOrFocusedElement();
    const curElementTagName = curElement?.tagName.toUpperCase();
    if (
      curElementTagName === "INPUT" ||
      curElementTagName === "TEXTAREA" ||
      curElementTagName === "SELECT" ||
      curElement?.isContentEditable
    ) {
      if (evt.keyCode !== 27) {
        return;
      }
    }
    if (cmd === 0) {
      let turnPage = 0,
        turnOnlyIfPageFit = false;
      switch (evt.keyCode) {
        case 38:
        case 33:
          if (pdfViewer.isVerticalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
          turnPage = -1;
          break;
        case 8:
          if (!isViewerInPresentationMode) {
            turnOnlyIfPageFit = true;
          }
          turnPage = -1;
          break;
        case 37:
          if (pdfViewer.isHorizontalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
        case 75:
        case 80:
          turnPage = -1;
          break;
        case 27:
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
        case 40:
        case 34:
          if (pdfViewer.isVerticalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
          turnPage = 1;
          break;
        case 13:
        case 32:
          if (!isViewerInPresentationMode) {
            turnOnlyIfPageFit = true;
          }
          turnPage = 1;
          break;
        case 39:
          if (pdfViewer.isHorizontalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
        case 74:
        case 78:
          turnPage = 1;
          break;
        case 36:
          if (isViewerInPresentationMode || PDFViewerApplication.page > 1) {
            PDFViewerApplication.page = 1;
            handled = true;
            ensureViewerFocused = true;
          }
          break;
        case 35:
          if (
            isViewerInPresentationMode ||
            PDFViewerApplication.page < PDFViewerApplication.pagesCount
          ) {
            PDFViewerApplication.page = PDFViewerApplication.pagesCount;
            handled = true;
            ensureViewerFocused = true;
          }
          break;
        case 83:
          PDFViewerApplication.pdfCursorTools?.switchTool(CursorTool.SELECT);
          break;
        case 72:
          PDFViewerApplication.pdfCursorTools?.switchTool(CursorTool.HAND);
          break;
        case 82:
          PDFViewerApplication.rotatePages(90);
          break;
        case 115:
          PDFViewerApplication.pdfSidebar?.toggle();
          break;
      }
      if (turnPage !== 0 && (!turnOnlyIfPageFit || pdfViewer.currentScaleValue === "page-fit")) {
        if (turnPage > 0) {
          pdfViewer.nextPage();
        } else {
          pdfViewer.previousPage();
        }
        handled = true;
      }
    }
    if (cmd === 4) {
      switch (evt.keyCode) {
        case 13:
        case 32:
          if (!isViewerInPresentationMode && pdfViewer.currentScaleValue !== "page-fit") {
            break;
          }
          pdfViewer.previousPage();
          handled = true;
          break;
        case 82:
          PDFViewerApplication.rotatePages(-90);
          break;
      }
    }
    if (!handled && !isViewerInPresentationMode) {
      if (
        (evt.keyCode >= 33 && evt.keyCode <= 40) ||
        (evt.keyCode === 32 && curElementTagName !== "BUTTON")
      ) {
        ensureViewerFocused = true;
      }
    }
    if (ensureViewerFocused && !pdfViewer.containsElement(curElement)) {
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
  function webViewerReportTelemetry({ details }) {
    PDFViewerApplication.externalServices.reportTelemetry(details);
  }
  return {
    validateFileURL,
    webViewerFileInputChange,
    loadFakeWorker,
    loadPDFBug,
    reportPageStatsPDFBug,
    webViewerPageRender,
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
    webViewerPresentationMode,
    webViewerSwitchAnnotationEditorMode,
    webViewerSwitchAnnotationEditorParams,
    webViewerPrint,
    webViewerDownload,
    webViewerOpenInExternalApp,
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
    webViewerResolutionChange,
    webViewerVisibilityChange,
    setZoomDisabledTimeout,
    webViewerWheel,
    webViewerTouchStart,
    webViewerTouchMove,
    webViewerTouchEnd,
    webViewerClick,
    webViewerKeyUp,
    webViewerKeyDown,
    beforeUnload,
    webViewerAnnotationEditorStatesChanged,
    webViewerReportTelemetry,
  };
}
export { createHelper };
