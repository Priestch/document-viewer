import {
  CursorTool,
  getActiveOrFocusedElement,
  normalizeWheelEventDirection,
  RenderingStates,
  SidebarView,
} from "../pdf.js/web/ui_utils";
import { FeatureTest } from "pdfjs-lib";
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
        const fileOrigin = new URL(file, window.location.href).origin;
        // Removing of the following line will not guarantee that the viewer will
        // start accepting URLs from foreign origin -- CORS headers on the remote
        // server must be properly configured.
        if (fileOrigin !== viewerOrigin) {
          throw new Error("file origin does not match viewer's");
        }
      } catch (ex) {
        PDFViewerApplication._documentError("pdfjs-loading-error", {
          message: ex.message,
        });
        throw ex;
      }
    };

    // eslint-disable-next-line no-var
    var onFileInputChange = function (evt) {
      if (this.pdfViewer?.isInPresentationMode) {
        return; // Opening a new PDF file isn't supported in Presentation Mode.
      }
      const file = evt.fileInput.files[0];
      this.open({
        url: URL.createObjectURL(file),
        originalUrl: file.name,
      });
    };

    // eslint-disable-next-line no-var
    var onOpenFile = function (evt) {
      this._openFileInput?.click();
    };
  }
  function onPageRender({ pageNumber }) {
    // If the page is (the most) visible when it starts rendering,
    // ensure that the page number input loading indicator is displayed.
    if (pageNumber === this.page) {
      this.toolbar?.updateLoadingIndicatorState(true);
    }
  }
  function onPageRendered({ pageNumber, error }) {
    // If the page is still visible when it has finished rendering,
    // ensure that the page number input loading indicator is hidden.
    if (pageNumber === this.page) {
      this.toolbar?.updateLoadingIndicatorState(false);
    }

    // Use the rendered page to set the corresponding thumbnail image.
    if (this.pdfSidebar?.visibleView === SidebarView.THUMBS) {
      const pageView = this.pdfViewer.getPageView(/* index = */ pageNumber - 1);
      const thumbnailView = this.pdfThumbnailViewer?.getThumbnail(
        /* index = */ pageNumber - 1
      );
      if (pageView) {
        thumbnailView?.setImage(pageView);
      }
    }
    if (error) {
      this._otherError("pdfjs-rendering-error", error);
    }
  }
  function onPageMode({ mode }) {
    // Handle the 'pagemode' hash parameter, see also `PDFLinkService_setHash`.
    let view;
    switch (mode) {
      case "thumbs":
        view = SidebarView.THUMBS;
        break;
      case "bookmarks":
      case "outline":
        // non-standard
        view = SidebarView.OUTLINE;
        break;
      case "attachments":
        // non-standard
        view = SidebarView.ATTACHMENTS;
        break;
      case "layers":
        // non-standard
        view = SidebarView.LAYERS;
        break;
      case "none":
        view = SidebarView.NONE;
        break;
      default:
        console.error('Invalid "pagemode" hash parameter: ' + mode);
        return;
    }
    this.pdfSidebar?.switchView(view, /* forceOpen = */ true);
  }
  function onNamedAction(evt) {
    // Processing a couple of named actions that might be useful, see also
    // `PDFLinkService.executeNamedAction`.
    switch (evt.action) {
      case "GoToPage":
        this.appConfig.toolbar?.pageNumber.select();
        break;
      case "Find":
        if (!this.supportsIntegratedFind) {
          this.findBar?.toggle();
        }
        break;
      case "Print":
        this.triggerPrinting();
        break;
      case "SaveAs":
        this.downloadOrSave();
        break;
    }
  }
  function onSidebarViewChanged({ view }) {
    this.pdfRenderingQueue.isThumbnailViewEnabled = view === SidebarView.THUMBS;
    if (this.isInitialViewSet) {
      // Only update the storage when the document has been loaded *and* rendered.
      this.store?.set("sidebarView", view).catch(() => {
        // Unable to write to storage.
      });
    }
  }
  function onUpdateViewarea({ location }) {
    if (this.isInitialViewSet) {
      // Only update the storage when the document has been loaded *and* rendered.
      this.store
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
    if (this.appConfig.secondaryToolbar) {
      this.appConfig.secondaryToolbar.viewBookmarkButton.href =
        this.pdfLinkService.getAnchorUrl(location.pdfOpenParams);
    }
  }
  function onViewerModesChanged(name, evt) {
    if (this.isInitialViewSet && !this.pdfViewer.isInPresentationMode) {
      // Only update the storage when the document has been loaded *and* rendered.
      this.store?.set(name, evt.mode).catch(() => {
        // Unable to write to storage.
      });
    }
  }
  function onResize() {
    const { pdfDocument, pdfViewer, pdfRenderingQueue } = this;
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
  function onHashchange(evt) {
    const hash = evt.hash;
    if (!hash) {
      return;
    }
    if (!this.isInitialViewSet) {
      this.initialBookmark = hash;
    } else if (!this.pdfHistory?.popStateInProgress) {
      this.pdfLinkService.setHash(hash);
    }
  }
  function onPageNumberChanged(evt) {
    const { pdfViewer } = this;
    // Note that for `<input type="number">` HTML elements, an empty string will
    // be returned for non-number inputs; hence we simply do nothing in that case.
    if (evt.value !== "") {
      this.pdfLinkService.goToPage(evt.value);
    }

    // Ensure that the page number input displays the correct value, even if the
    // value entered by the user was invalid (e.g. a floating point number).
    if (
      evt.value !== pdfViewer.currentPageNumber.toString() &&
      evt.value !== pdfViewer.currentPageLabel
    ) {
      this.toolbar?.setPageNumber(
        pdfViewer.currentPageNumber,
        pdfViewer.currentPageLabel
      );
    }
  }
  function onImageAltTextSettings() {
    this.imageAltTextSettings?.open({
      enableGuessAltText: AppOptions.get("enableGuessAltText"),
      enableNewAltTextWhenAddingImage: AppOptions.get(
        "enableNewAltTextWhenAddingImage"
      ),
    });
  }
  function onFindFromUrlHash(evt) {
    this.eventBus.dispatch("find", {
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
  function onUpdateFindMatchesCount({ matchesCount }) {
    if (this.supportsIntegratedFind) {
      this.externalServices.updateFindMatchesCount(matchesCount);
    } else {
      this.findBar?.updateResultsCount(matchesCount);
    }
  }
  function onUpdateFindControlState({
    state,
    previous,
    entireWord,
    matchesCount,
    rawQuery,
  }) {
    if (this.supportsIntegratedFind) {
      this.externalServices.updateFindControlState({
        result: state,
        findPrevious: previous,
        entireWord,
        matchesCount,
        rawQuery,
      });
    } else {
      this.findBar?.updateUIState(state, previous, matchesCount);
    }
  }
  function onScaleChanging(evt) {
    this.toolbar?.setPageScale(evt.presetValue, evt.scale);
    this.pdfViewer.update();
  }
  function onRotationChanging(evt) {
    if (this.pdfThumbnailViewer) {
      this.pdfThumbnailViewer.pagesRotation = evt.pagesRotation;
    }
    this.forceRendering();
    // Ensure that the active page doesn't change during rotation.
    this.pdfViewer.currentPageNumber = evt.pageNumber;
  }
  function onPageChanging({ pageNumber, pageLabel }) {
    this.toolbar?.setPageNumber(pageNumber, pageLabel);
    this.secondaryToolbar?.setPageNumber(pageNumber);
    if (this.pdfSidebar?.visibleView === SidebarView.THUMBS) {
      this.pdfThumbnailViewer?.scrollThumbnailIntoView(pageNumber);
    }

    // Show/hide the loading indicator in the page number input element.
    const currentPage = this.pdfViewer.getPageView(
      /* index = */ pageNumber - 1
    );
    this.toolbar?.updateLoadingIndicatorState(
      currentPage?.renderingState === RenderingStates.RUNNING
    );
  }
  function onWheel(evt) {
    const {
      pdfViewer,
      supportsMouseWheelZoomCtrlKey,
      supportsMouseWheelZoomMetaKey,
      supportsPinchToZoom,
    } = this;
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
    const isBuiltInMac =
      typeof PDFJSDev !== "undefined" &&
      PDFJSDev.test("MOZCENTRAL") &&
      FeatureTest.platform.isMac;
    const isPinchToZoom =
      evt.ctrlKey &&
      !this._isCtrlKeyDown &&
      deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
      evt.deltaX === 0 &&
      (Math.abs(scaleFactor - 1) < 0.05 || isBuiltInMac) &&
      evt.deltaZ === 0;
    const origin = [evt.clientX, evt.clientY];
    if (
      isPinchToZoom ||
      (evt.ctrlKey && supportsMouseWheelZoomCtrlKey) ||
      (evt.metaKey && supportsMouseWheelZoomMetaKey)
    ) {
      // Only zoom the pages, not the entire viewer.
      evt.preventDefault();
      // NOTE: this check must be placed *after* preventDefault.
      if (
        this._isScrolling ||
        document.visibilityState === "hidden" ||
        this.overlayManager.active
      ) {
        return;
      }
      if (isPinchToZoom && supportsPinchToZoom) {
        scaleFactor = this._accumulateFactor(
          pdfViewer.currentScale,
          scaleFactor,
          "_wheelUnusedFactor"
        );
        this.updateZoom(null, scaleFactor, origin);
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
          //
          // If we're getting fractional lines (I can't think of a scenario
          // this might actually happen), be safe and use the accumulator.
          ticks =
            Math.abs(delta) >= 1
              ? Math.sign(delta)
              : this._accumulateTicks(delta, "_wheelUnusedTicks");
        } else {
          // pixel-based devices
          const PIXELS_PER_LINE_SCALE = 30;
          ticks = this._accumulateTicks(
            delta / PIXELS_PER_LINE_SCALE,
            "_wheelUnusedTicks"
          );
        }
        this.updateZoom(ticks, null, origin);
      }
    }
  }
  function closeSecondaryToolbar(evt) {
    if (!this.secondaryToolbar?.isOpen) {
      return;
    }
    const appConfig = this.appConfig;
    if (
      this.pdfViewer.containsElement(evt.target) ||
      (appConfig.toolbar?.container.contains(evt.target) &&
        // TODO: change the `contains` for an equality check when the bug:
        //  https://bugzilla.mozilla.org/show_bug.cgi?id=1921984
        // is fixed.
        !appConfig.secondaryToolbar?.toggleButton.contains(evt.target))
    ) {
      this.secondaryToolbar.close();
    }
  }
  function closeEditorUndoBar(evt) {
    if (!this.editorUndoBar?.isOpen) {
      return;
    }
    if (this.appConfig.secondaryToolbar?.toolbar.contains(evt.target)) {
      this.editorUndoBar.hide();
    }
  }
  function onClick(evt) {
    closeSecondaryToolbar.call(this, evt);
    closeEditorUndoBar.call(this, evt);
  }
  function onKeyUp(evt) {
    // evt.ctrlKey is false hence we use evt.key.
    if (evt.key === "Control") {
      this._isCtrlKeyDown = false;
    }
  }
  function onKeyDown(evt) {
    this._isCtrlKeyDown = evt.key === "Control";
    if (
      this.editorUndoBar?.isOpen &&
      evt.keyCode !== 9 &&
      evt.keyCode !== 16 &&
      !(
        (evt.keyCode === 13 || evt.keyCode === 32) &&
        getActiveOrFocusedElement() === this.appConfig.editorUndoBar.undoButton
      )
    ) {
      // Hide undo bar on keypress except for Shift, Tab, Shift+Tab.
      // Also avoid hiding if the undo button is triggered.
      this.editorUndoBar.hide();
    }
    if (this.overlayManager.active) {
      return;
    }
    const { eventBus, pdfViewer } = this;
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
        case 70:
          // f
          if (!this.supportsIntegratedFind && !evt.shiftKey) {
            this.findBar?.open();
            handled = true;
          }
          break;
        case 71:
          // g
          if (!this.supportsIntegratedFind) {
            const { state } = this.findController;
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
        case 61: // FF/Mac '='
        case 107: // FF '+' and '='
        case 187: // Chrome '+'
        case 171:
          // FF with German keyboard
          this.zoomIn();
          handled = true;
          break;
        case 173: // FF/Mac '-'
        case 109: // FF '-'
        case 189:
          // Chrome '-'
          this.zoomOut();
          handled = true;
          break;
        case 48: // '0'
        case 96:
          // '0' on Numpad of Swedish keyboard
          if (!isViewerInPresentationMode) {
            // keeping it unhandled (to restore page zoom to 100%)
            setTimeout(() => {
              // ... and resetting the scale after browser adjusts its scale
              this.zoomReset();
            });
            handled = false;
          }
          break;
        case 38:
          // up arrow
          if (isViewerInPresentationMode || this.page > 1) {
            this.page = 1;
            handled = true;
            ensureViewerFocused = true;
          }
          break;
        case 40:
          // down arrow
          if (isViewerInPresentationMode || this.page < this.pagesCount) {
            this.page = this.pagesCount;
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
          case 83:
            // s
            eventBus.dispatch("download", {
              source: window,
            });
            handled = true;
            break;
          case 79:
            // o
            if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
              eventBus.dispatch("openfile", {
                source: window,
              });
              handled = true;
            }
            break;
        }
      }
    }

    // CTRL+ALT or Option+Command
    if (cmd === 3 || cmd === 10) {
      switch (evt.keyCode) {
        case 80:
          // p
          this.requestPresentationMode();
          handled = true;
          this.externalServices.reportTelemetry({
            type: "buttons",
            data: {
              id: "presentationModeKeyboard",
            },
          });
          break;
        case 71:
          // g
          // focuses input#pageNumber field
          if (this.appConfig.toolbar) {
            this.appConfig.toolbar.pageNumber.select();
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
      (curElementTagName === "BUTTON" &&
        (evt.keyCode === /* Enter = */ 13 ||
          evt.keyCode === /* Space = */ 32)) ||
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
        case 38:
          // up arrow
          if (this.supportsCaretBrowsingMode) {
            this.moveCaret(/* isUp = */ true, /* select = */ false);
            handled = true;
            break;
          }
        /* falls through */
        case 33:
          // pg up
          // vertical scrolling using arrow/pg keys
          if (pdfViewer.isVerticalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
          turnPage = -1;
          break;
        case 8:
          // backspace
          if (!isViewerInPresentationMode) {
            turnOnlyIfPageFit = true;
          }
          turnPage = -1;
          break;
        case 37:
          // left arrow
          if (this.supportsCaretBrowsingMode) {
            return;
          }
          // horizontal scrolling using arrow keys
          if (pdfViewer.isHorizontalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
        /* falls through */
        case 75: // 'k'
        case 80:
          // 'p'
          turnPage = -1;
          break;
        case 27:
          // esc key
          if (this.secondaryToolbar?.isOpen) {
            this.secondaryToolbar.close();
            handled = true;
          }
          if (!this.supportsIntegratedFind && this.findBar?.opened) {
            this.findBar.close();
            handled = true;
          }
          break;
        case 40:
          // down arrow
          if (this.supportsCaretBrowsingMode) {
            this.moveCaret(/* isUp = */ false, /* select = */ false);
            handled = true;
            break;
          }
        /* falls through */
        case 34:
          // pg down
          // vertical scrolling using arrow/pg keys
          if (pdfViewer.isVerticalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
          turnPage = 1;
          break;
        case 13: // enter key
        case 32:
          // spacebar
          if (!isViewerInPresentationMode) {
            turnOnlyIfPageFit = true;
          }
          turnPage = 1;
          break;
        case 39:
          // right arrow
          if (this.supportsCaretBrowsingMode) {
            return;
          }
          // horizontal scrolling using arrow keys
          if (pdfViewer.isHorizontalScrollbarEnabled) {
            turnOnlyIfPageFit = true;
          }
        /* falls through */
        case 74: // 'j'
        case 78:
          // 'n'
          turnPage = 1;
          break;
        case 36:
          // home
          if (isViewerInPresentationMode || this.page > 1) {
            this.page = 1;
            handled = true;
            ensureViewerFocused = true;
          }
          break;
        case 35:
          // end
          if (isViewerInPresentationMode || this.page < this.pagesCount) {
            this.page = this.pagesCount;
            handled = true;
            ensureViewerFocused = true;
          }
          break;
        case 83:
          // 's'
          this.pdfCursorTools?.switchTool(CursorTool.SELECT);
          break;
        case 72:
          // 'h'
          this.pdfCursorTools?.switchTool(CursorTool.HAND);
          break;
        case 82:
          // 'r'
          this.rotatePages(90);
          break;
        case 115:
          // F4
          this.pdfSidebar?.toggle();
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
        case 32:
          // spacebar
          if (
            !isViewerInPresentationMode &&
            pdfViewer.currentScaleValue !== "page-fit"
          ) {
            break;
          }
          pdfViewer.previousPage();
          handled = true;
          break;
        case 38:
          // up arrow
          this.moveCaret(/* isUp = */ true, /* select = */ true);
          handled = true;
          break;
        case 40:
          // down arrow
          this.moveCaret(/* isUp = */ false, /* select = */ true);
          handled = true;
          break;
        case 82:
          // 'r'
          this.rotatePages(-90);
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
  return {
    validateFileURL: validateFileURL,
    onFileInputChange: onFileInputChange,
    onOpenFile: onOpenFile,
    onPageRender: onPageRender,
    onPageRendered: onPageRendered,
    onPageMode: onPageMode,
    onNamedAction: onNamedAction,
    onSidebarViewChanged: onSidebarViewChanged,
    onUpdateViewarea: onUpdateViewarea,
    onViewerModesChanged: onViewerModesChanged,
    onResize: onResize,
    onHashchange: onHashchange,
    onPageNumberChanged: onPageNumberChanged,
    onImageAltTextSettings: onImageAltTextSettings,
    onFindFromUrlHash: onFindFromUrlHash,
    onUpdateFindMatchesCount: onUpdateFindMatchesCount,
    onUpdateFindControlState: onUpdateFindControlState,
    onScaleChanging: onScaleChanging,
    onRotationChanging: onRotationChanging,
    onPageChanging: onPageChanging,
    onWheel: onWheel,
    closeSecondaryToolbar: closeSecondaryToolbar,
    closeEditorUndoBar: closeEditorUndoBar,
    onClick: onClick,
    onKeyUp: onKeyUp,
    onKeyDown: onKeyDown,
    beforeUnload: beforeUnload,
  };
}
export { createHelper };
