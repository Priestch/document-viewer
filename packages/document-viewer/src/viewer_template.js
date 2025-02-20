const template = `
<div data-dom-id="outerContainer" class="outerContainer">
  <div data-dom-id="sidebarContainer" class="sidebarContainer">
    <div data-dom-id="toolbarSidebar" class="toolbarSidebar">
      <div data-dom-id="toolbarSidebarLeft" class="toolbarSidebarLeft">
        <div
          role="radiogroup"
          data-dom-id="sidebarViewButtons"
          class="splitToolbarButton toggled sidebarViewButtons"
        >
          <button
            title="Show Thumbnails"
            tabindex="2"
            data-l10n-id="pdfjs-thumbs-button"
            role="radio"
            aria-checked="true"
            aria-controls="thumbnailView"
            data-dom-id="viewThumbnail"
            class="toolbarButton toggled viewThumbnail"
          >
            <span data-l10n-id="pdfjs-thumbs-button-label"
              >Thumbnails</span
            ></button
          ><button
            title="Show Document Outline (double-click to expand/collapse all items)"
            tabindex="3"
            data-l10n-id="pdfjs-document-outline-button"
            role="radio"
            aria-checked="false"
            aria-controls="outlineView"
            data-dom-id="viewOutline"
            class="toolbarButton viewOutline"
          >
            <span data-l10n-id="pdfjs-document-outline-button-label"
              >Document Outline</span
            ></button
          ><button
            title="Show Attachments"
            tabindex="4"
            data-l10n-id="pdfjs-attachments-button"
            role="radio"
            aria-checked="false"
            aria-controls="attachmentsView"
            data-dom-id="viewAttachments"
            class="toolbarButton viewAttachments"
          >
            <span data-l10n-id="pdfjs-attachments-button-label"
              >Attachments</span
            ></button
          ><button
            title="Show Layers (double-click to reset all layers to the default state)"
            tabindex="5"
            data-l10n-id="pdfjs-layers-button"
            role="radio"
            aria-checked="false"
            aria-controls="layersView"
            data-dom-id="viewLayers"
            class="toolbarButton viewLayers"
          >
            <span data-l10n-id="pdfjs-layers-button-label">Layers</span>
          </button>
        </div>
      </div>
      <div data-dom-id="toolbarSidebarRight" class="toolbarSidebarRight">
        <div
          data-dom-id="outlineOptionsContainer"
          class="outlineOptionsContainer"
        >
          <div class="verticalToolbarSeparator"></div>
          <button
            disabled="disabled"
            title="Find Current Outline Item"
            tabindex="6"
            data-l10n-id="pdfjs-current-outline-item-button"
            data-dom-id="currentOutlineItem"
            class="toolbarButton currentOutlineItem"
          >
            <span data-l10n-id="pdfjs-current-outline-item-button-label"
              >Current Outline Item</span
            >
          </button>
        </div>
      </div>
    </div>
    <div data-dom-id="sidebarContent" class="sidebarContent">
      <div data-dom-id="thumbnailView" class="thumbnailView"></div>
      <div data-dom-id="outlineView" class="hidden outlineView"></div>
      <div data-dom-id="attachmentsView" class="hidden attachmentsView"></div>
      <div data-dom-id="layersView" class="hidden layersView"></div>
    </div>
    <div data-dom-id="sidebarResizer" class="sidebarResizer"></div>
  </div>
  <!-- sidebarContainer -->
  <div data-dom-id="mainContainer" class="mainContainer">
    <div class="findbar hidden doorHanger" data-dom-id="findbar">
      <div data-dom-id="findbarInputContainer" class="findbarInputContainer">
        <span class="loadingInput end"
          ><input
            title="Find"
            placeholder="Find in document…"
            tabindex="91"
            data-l10n-id="pdfjs-find-input"
            aria-invalid="false"
            data-dom-id="findInput"
            class="toolbarField findInput"
        /></span>
        <div class="splitToolbarButton">
          <button
            title="Find the previous occurrence of the phrase"
            tabindex="92"
            data-l10n-id="pdfjs-find-previous-button"
            data-dom-id="findPrevious"
            class="toolbarButton findPrevious"
          >
            <span data-l10n-id="pdfjs-find-previous-button-label"
              >Previous</span
            >
          </button>
          <div class="splitToolbarButtonSeparator"></div>
          <button
            title="Find the next occurrence of the phrase"
            tabindex="93"
            data-l10n-id="pdfjs-find-next-button"
            data-dom-id="findNext"
            class="toolbarButton findNext"
          >
            <span data-l10n-id="pdfjs-find-next-button-label">Next</span>
          </button>
        </div>
      </div>
      <div
        data-dom-id="findbarOptionsOneContainer"
        class="findbarOptionsOneContainer"
      >
        <label
          ><input
            type="checkbox"
            tabindex="94"
            data-dom-id="findHighlightAll"
            class="toolbarField findHighlightAll"
          /><span
            class="toolbarLabel"
            data-l10n-id="pdfjs-find-highlight-checkbox"
            >Highlight All</span
          ></label
        ><!--Removed!--><label
          ><input
            type="checkbox"
            tabindex="95"
            data-dom-id="findMatchCase"
            class="toolbarField findMatchCase"
          /><span
            class="toolbarLabel"
            data-l10n-id="pdfjs-find-match-case-checkbox-label"
            >Match Case</span
          ></label
        ><!--Removed!-->
      </div>
      <div
        data-dom-id="findbarOptionsTwoContainer"
        class="findbarOptionsTwoContainer"
      >
        <label
          ><input
            type="checkbox"
            tabindex="96"
            data-dom-id="findMatchDiacritics"
            class="toolbarField findMatchDiacritics"
          /><span
            class="toolbarLabel"
            data-l10n-id="pdfjs-find-match-diacritics-checkbox-label"
            >Match Diacritics</span
          ></label
        ><!--Removed!--><label
          ><input
            type="checkbox"
            tabindex="97"
            data-dom-id="findEntireWord"
            class="toolbarField findEntireWord"
          /><span
            class="toolbarLabel"
            data-l10n-id="pdfjs-find-entire-word-checkbox-label"
            >Whole Words</span
          ></label
        ><!--Removed!-->
      </div>
      <div
        aria-live="polite"
        data-dom-id="findbarMessageContainer"
        class="findbarMessageContainer"
      >
        <span
          data-dom-id="findResultsCount"
          class="toolbarLabel findResultsCount"
        ></span
        ><span data-dom-id="findMsg" class="toolbarLabel findMsg"></span>
      </div>
    </div>
    <!-- findbar -->
    <div
      data-dom-id="editorHighlightParamsToolbar"
      class="editorParamsToolbar hidden doorHangerRight editorHighlightParamsToolbar"
    >
      <div
        data-dom-id="highlightParamsToolbarContainer"
        class="editorParamsToolbarContainer highlightParamsToolbarContainer"
      >
        <div
          data-dom-id="editorHighlightColorPicker"
          class="colorPicker editorHighlightColorPicker"
        >
          <span
            data-l10n-id="pdfjs-editor-highlight-colorpicker-label"
            data-dom-id="highlightColorPickerLabel"
            class="editorParamsLabel highlightColorPickerLabel"
            >Highlight color</span
          >
        </div>
      </div>
    </div>
    <div
      data-dom-id="editorFreeTextParamsToolbar"
      class="editorParamsToolbar hidden doorHangerRight editorFreeTextParamsToolbar"
    >
      <div class="editorParamsToolbarContainer">
        <div class="editorParamsSetter">
          <!--Removed!--><label
            ><input
              type="color"
              tabindex="102"
              data-dom-id="editorFreeTextColor"
              class="editorParamsColor editorFreeTextColor"
            /><span
              class="toolbarLabel"
              data-l10n-id="pdfjs-editor-free-text-color-input"
              >Color</span
            ></label
          >
        </div>
        <div class="editorParamsSetter">
          <!--Removed!--><label
            ><input
              type="range"
              value="10"
              min="5"
              max="100"
              step="1"
              tabindex="103"
              data-dom-id="editorFreeTextFontSize"
              class="editorParamsSlider editorFreeTextFontSize"
            /><span
              class="toolbarLabel"
              data-l10n-id="pdfjs-editor-free-text-size-input"
              >Size</span
            ></label
          >
        </div>
      </div>
    </div>
    <div
      data-dom-id="editorInkParamsToolbar"
      class="editorParamsToolbar hidden doorHangerRight editorInkParamsToolbar"
    >
      <div class="editorParamsToolbarContainer">
        <div class="editorParamsSetter">
          <!--Removed!--><label
            ><input
              type="color"
              tabindex="104"
              data-dom-id="editorInkColor"
              class="editorParamsColor editorInkColor"
            /><span
              class="toolbarLabel"
              data-l10n-id="pdfjs-editor-ink-color-input"
              >Color</span
            ></label
          >
        </div>
        <div class="editorParamsSetter">
          <!--Removed!--><label
            ><input
              type="range"
              value="1"
              min="1"
              max="20"
              step="1"
              tabindex="105"
              data-dom-id="editorInkThickness"
              class="editorParamsSlider editorInkThickness"
            /><span
              class="toolbarLabel"
              data-l10n-id="pdfjs-editor-ink-thickness-input"
              >Thickness</span
            ></label
          >
        </div>
        <div class="editorParamsSetter">
          <!--Removed!--><label
            ><input
              type="range"
              value="100"
              min="1"
              max="100"
              step="1"
              tabindex="106"
              data-dom-id="editorInkOpacity"
              class="editorParamsSlider editorInkOpacity"
            /><span
              class="toolbarLabel"
              data-l10n-id="pdfjs-editor-ink-opacity-input"
              >Opacity</span
            ></label
          >
        </div>
      </div>
    </div>
    <div
      data-dom-id="editorStampParamsToolbar"
      class="editorParamsToolbar hidden doorHangerRight editorStampParamsToolbar"
    >
      <div class="editorParamsToolbarContainer">
        <button
          title="Add image"
          tabindex="107"
          data-l10n-id="pdfjs-editor-stamp-add-image-button"
          data-dom-id="editorStampAddImage"
          class="secondaryToolbarButton editorStampAddImage"
        >
          <span
            class="editorParamsLabel"
            data-l10n-id="pdfjs-editor-stamp-add-image-button-label"
            >Add image</span
          >
        </button>
      </div>
    </div>
    <div
      class="secondaryToolbar hidden doorHangerRight"
      data-dom-id="secondaryToolbar"
    >
      <div
        data-dom-id="secondaryToolbarButtonContainer"
        class="secondaryToolbarButtonContainer"
      >
        <!--#if GENERIC--><button
          title="Open File"
          tabindex="51"
          data-l10n-id="pdfjs-open-file-button"
          data-dom-id="secondaryOpenFile"
          class="secondaryToolbarButton secondaryOpenFile"
        >
          <span data-l10n-id="pdfjs-open-file-button-label">Open</span></button
        ><!--#endif--><button
          title="Print"
          tabindex="52"
          data-l10n-id="pdfjs-print-button"
          data-dom-id="secondaryPrint"
          class="secondaryToolbarButton visibleMediumView secondaryPrint"
        >
          <span data-l10n-id="pdfjs-print-button-label">Print</span></button
        ><button
          title="Save"
          tabindex="53"
          data-l10n-id="pdfjs-save-button"
          data-dom-id="secondaryDownload"
          class="secondaryToolbarButton visibleMediumView secondaryDownload"
        >
          <span data-l10n-id="pdfjs-save-button-label">Save</span></button
        ><!--#if GENERIC-->
        <div class="horizontalToolbarSeparator"></div>
        <!--#else--><!--        <div class="horizontalToolbarSeparator visibleMediumView"></div>--><!--#endif--><button
          title="Switch to Presentation Mode"
          tabindex="54"
          data-l10n-id="pdfjs-presentation-mode-button"
          data-dom-id="presentationMode"
          class="secondaryToolbarButton presentationMode"
        >
          <span data-l10n-id="pdfjs-presentation-mode-button-label"
            >Presentation Mode</span
          ></button
        ><a
          href="#"
          title="Current Page (View URL from Current Page)"
          tabindex="55"
          data-l10n-id="pdfjs-bookmark-button"
          data-dom-id="viewBookmark"
          class="secondaryToolbarButton viewBookmark"
          ><span data-l10n-id="pdfjs-bookmark-button-label"
            >Current Page</span
          ></a
        >
        <div
          data-dom-id="viewBookmarkSeparator"
          class="horizontalToolbarSeparator viewBookmarkSeparator"
        ></div>
        <button
          title="Go to First Page"
          tabindex="56"
          data-l10n-id="pdfjs-first-page-button"
          data-dom-id="firstPage"
          class="secondaryToolbarButton firstPage"
        >
          <span data-l10n-id="pdfjs-first-page-button-label"
            >Go to First Page</span
          ></button
        ><button
          title="Go to Last Page"
          tabindex="57"
          data-l10n-id="pdfjs-last-page-button"
          data-dom-id="lastPage"
          class="secondaryToolbarButton lastPage"
        >
          <span data-l10n-id="pdfjs-last-page-button-label"
            >Go to Last Page</span
          >
        </button>
        <div class="horizontalToolbarSeparator"></div>
        <button
          title="Rotate Clockwise"
          tabindex="58"
          data-l10n-id="pdfjs-page-rotate-cw-button"
          data-dom-id="pageRotateCw"
          class="secondaryToolbarButton pageRotateCw"
        >
          <span data-l10n-id="pdfjs-page-rotate-cw-button-label"
            >Rotate Clockwise</span
          ></button
        ><button
          title="Rotate Counterclockwise"
          tabindex="59"
          data-l10n-id="pdfjs-page-rotate-ccw-button"
          data-dom-id="pageRotateCcw"
          class="secondaryToolbarButton pageRotateCcw"
        >
          <span data-l10n-id="pdfjs-page-rotate-ccw-button-label"
            >Rotate Counterclockwise</span
          >
        </button>
        <div class="horizontalToolbarSeparator"></div>
        <div
          role="radiogroup"
          data-dom-id="cursorToolButtons"
          class="cursorToolButtons"
        >
          <button
            title="Enable Text Selection Tool"
            tabindex="60"
            data-l10n-id="pdfjs-cursor-text-select-tool-button"
            role="radio"
            aria-checked="true"
            data-dom-id="cursorSelectTool"
            class="secondaryToolbarButton toggled cursorSelectTool"
          >
            <span data-l10n-id="pdfjs-cursor-text-select-tool-button-label"
              >Text Selection Tool</span
            ></button
          ><button
            title="Enable Hand Tool"
            tabindex="61"
            data-l10n-id="pdfjs-cursor-hand-tool-button"
            role="radio"
            aria-checked="false"
            data-dom-id="cursorHandTool"
            class="secondaryToolbarButton cursorHandTool"
          >
            <span data-l10n-id="pdfjs-cursor-hand-tool-button-label"
              >Hand Tool</span
            >
          </button>
        </div>
        <div class="horizontalToolbarSeparator"></div>
        <div
          role="radiogroup"
          data-dom-id="scrollModeButtons"
          class="scrollModeButtons"
        >
          <button
            title="Use Page Scrolling"
            tabindex="62"
            data-l10n-id="pdfjs-scroll-page-button"
            role="radio"
            aria-checked="false"
            data-dom-id="scrollPage"
            class="secondaryToolbarButton scrollPage"
          >
            <span data-l10n-id="pdfjs-scroll-page-button-label"
              >Page Scrolling</span
            ></button
          ><button
            title="Use Vertical Scrolling"
            tabindex="63"
            data-l10n-id="pdfjs-scroll-vertical-button"
            role="radio"
            aria-checked="true"
            data-dom-id="scrollVertical"
            class="secondaryToolbarButton toggled scrollVertical"
          >
            <span data-l10n-id="pdfjs-scroll-vertical-button-label"
              >Vertical Scrolling</span
            ></button
          ><button
            title="Use Horizontal Scrolling"
            tabindex="64"
            data-l10n-id="pdfjs-scroll-horizontal-button"
            role="radio"
            aria-checked="false"
            data-dom-id="scrollHorizontal"
            class="secondaryToolbarButton scrollHorizontal"
          >
            <span data-l10n-id="pdfjs-scroll-horizontal-button-label"
              >Horizontal Scrolling</span
            ></button
          ><button
            title="Use Wrapped Scrolling"
            tabindex="65"
            data-l10n-id="pdfjs-scroll-wrapped-button"
            role="radio"
            aria-checked="false"
            data-dom-id="scrollWrapped"
            class="secondaryToolbarButton scrollWrapped"
          >
            <span data-l10n-id="pdfjs-scroll-wrapped-button-label"
              >Wrapped Scrolling</span
            >
          </button>
        </div>
        <div class="horizontalToolbarSeparator"></div>
        <div
          role="radiogroup"
          data-dom-id="spreadModeButtons"
          class="spreadModeButtons"
        >
          <button
            title="Do not join page spreads"
            tabindex="66"
            data-l10n-id="pdfjs-spread-none-button"
            role="radio"
            aria-checked="true"
            data-dom-id="spreadNone"
            class="secondaryToolbarButton toggled spreadNone"
          >
            <span data-l10n-id="pdfjs-spread-none-button-label"
              >No Spreads</span
            ></button
          ><button
            title="Join page spreads starting with odd-numbered pages"
            tabindex="67"
            data-l10n-id="pdfjs-spread-odd-button"
            role="radio"
            aria-checked="false"
            data-dom-id="spreadOdd"
            class="secondaryToolbarButton spreadOdd"
          >
            <span data-l10n-id="pdfjs-spread-odd-button-label"
              >Odd Spreads</span
            ></button
          ><button
            title="Join page spreads starting with even-numbered pages"
            tabindex="68"
            data-l10n-id="pdfjs-spread-even-button"
            role="radio"
            aria-checked="false"
            data-dom-id="spreadEven"
            class="secondaryToolbarButton spreadEven"
          >
            <span data-l10n-id="pdfjs-spread-even-button-label"
              >Even Spreads</span
            >
          </button>
        </div>
        <div class="horizontalToolbarSeparator"></div>
        <button
          title="Document Properties…"
          tabindex="69"
          data-l10n-id="pdfjs-document-properties-button"
          aria-controls="documentPropertiesDialog"
          data-dom-id="documentProperties"
          class="secondaryToolbarButton documentProperties"
        >
          <span data-l10n-id="pdfjs-document-properties-button-label"
            >Document Properties…</span
          >
        </button>
      </div>
    </div>
    <!-- secondaryToolbar -->
    <div class="toolbar">
      <div data-dom-id="toolbarContainer" class="toolbarContainer">
        <div data-dom-id="toolbarViewer" class="toolbarViewer">
          <div data-dom-id="toolbarViewerLeft" class="toolbarViewerLeft">
            <button
              title="Toggle Sidebar"
              tabindex="11"
              data-l10n-id="pdfjs-toggle-sidebar-button"
              aria-expanded="false"
              aria-controls="sidebarContainer"
              data-dom-id="sidebarToggle"
              class="toolbarButton sidebarToggle"
            >
              <span data-l10n-id="pdfjs-toggle-sidebar-button-label"
                >Toggle Sidebar</span
              >
            </button>
            <div class="toolbarButtonSpacer"></div>
            <button
              title="Find in Document"
              tabindex="12"
              data-l10n-id="pdfjs-findbar-button"
              aria-expanded="false"
              aria-controls="findbar"
              data-dom-id="viewFind"
              class="toolbarButton viewFind"
            >
              <span data-l10n-id="pdfjs-findbar-button-label">Find</span>
            </button>
            <div class="splitToolbarButton hiddenSmallView">
              <button
                title="Previous Page"
                tabindex="13"
                data-l10n-id="pdfjs-previous-button"
                data-dom-id="previous"
                class="toolbarButton previous"
              >
                <span data-l10n-id="pdfjs-previous-button-label">Previous</span>
              </button>
              <div class="splitToolbarButtonSeparator"></div>
              <button
                title="Next Page"
                tabindex="14"
                data-l10n-id="pdfjs-next-button"
                data-dom-id="next"
                class="toolbarButton next"
              >
                <span data-l10n-id="pdfjs-next-button-label">Next</span>
              </button>
            </div>
            <span class="loadingInput start"
              ><input
                type="number"
                title="Page"
                value="1"
                min="1"
                tabindex="15"
                data-l10n-id="pdfjs-page-input"
                autocomplete="off"
                data-dom-id="pageNumber"
                class="toolbarField pageNumber" /></span
            ><span data-dom-id="numPages" class="toolbarLabel numPages"></span>
          </div>
          <div data-dom-id="toolbarViewerRight" class="toolbarViewerRight">
            <div
              role="radiogroup"
              data-dom-id="editorModeButtons"
              class="splitToolbarButton toggled editorModeButtons"
            >
              <button
                hidden="true"
                disabled="disabled"
                title="Highlight"
                role="radio"
                aria-checked="false"
                aria-controls="editorHighlightParamsToolbar"
                tabindex="31"
                data-l10n-id="pdfjs-editor-highlight-button"
                data-dom-id="editorHighlight"
                class="toolbarButton editorHighlight"
              >
                <span data-l10n-id="pdfjs-editor-highlight-button-label"
                  >Highlight</span
                ></button
              ><button
                disabled="disabled"
                title="Text"
                role="radio"
                aria-checked="false"
                aria-controls="editorFreeTextParamsToolbar"
                tabindex="32"
                data-l10n-id="pdfjs-editor-free-text-button"
                data-dom-id="editorFreeText"
                class="toolbarButton editorFreeText"
              >
                <span data-l10n-id="pdfjs-editor-free-text-button-label"
                  >Text</span
                ></button
              ><button
                disabled="disabled"
                title="Draw"
                role="radio"
                aria-checked="false"
                aria-controls="editorInkParamsToolbar"
                tabindex="33"
                data-l10n-id="pdfjs-editor-ink-button"
                data-dom-id="editorInk"
                class="toolbarButton editorInk"
              >
                <span data-l10n-id="pdfjs-editor-ink-button-label"
                  >Draw</span
                ></button
              ><button
                disabled="disabled"
                title="Add or edit images"
                role="radio"
                aria-checked="false"
                aria-controls="editorStampParamsToolbar"
                tabindex="34"
                data-l10n-id="pdfjs-editor-stamp-button"
                data-dom-id="editorStamp"
                class="toolbarButton editorStamp"
              >
                <span data-l10n-id="pdfjs-editor-stamp-button-label"
                  >Add or edit images</span
                >
              </button>
            </div>
            <div
              data-dom-id="editorModeSeparator"
              class="verticalToolbarSeparator editorModeSeparator"
            ></div>
            <button
              title="Print"
              tabindex="41"
              data-l10n-id="pdfjs-print-button"
              data-dom-id="print"
              class="toolbarButton hiddenMediumView print"
            >
              <span data-l10n-id="pdfjs-print-button-label">Print</span></button
            ><button
              title="Save"
              tabindex="42"
              data-l10n-id="pdfjs-save-button"
              data-dom-id="download"
              class="toolbarButton hiddenMediumView download"
            >
              <span data-l10n-id="pdfjs-save-button-label">Save</span>
            </button>
            <div class="verticalToolbarSeparator hiddenMediumView"></div>
            <button
              title="Tools"
              tabindex="43"
              data-l10n-id="pdfjs-tools-button"
              aria-expanded="false"
              aria-controls="secondaryToolbar"
              data-dom-id="secondaryToolbarToggle"
              class="toolbarButton secondaryToolbarToggle"
            >
              <span data-l10n-id="pdfjs-tools-button-label">Tools</span>
            </button>
          </div>
          <div data-dom-id="toolbarViewerMiddle" class="toolbarViewerMiddle">
            <div class="splitToolbarButton">
              <button
                title="Zoom Out"
                tabindex="21"
                data-l10n-id="pdfjs-zoom-out-button"
                data-dom-id="zoomOut"
                class="toolbarButton zoomOut"
              >
                <span data-l10n-id="pdfjs-zoom-out-button-label">Zoom Out</span>
              </button>
              <div class="splitToolbarButtonSeparator"></div>
              <button
                title="Zoom In"
                tabindex="22"
                data-l10n-id="pdfjs-zoom-in-button"
                data-dom-id="zoomIn"
                class="toolbarButton zoomIn"
              >
                <span data-l10n-id="pdfjs-zoom-in-button-label">Zoom In</span>
              </button>
            </div>
            <span
              data-dom-id="scaleSelectContainer"
              class="dropdownToolbarButton scaleSelectContainer"
              ><select
                title="Zoom"
                tabindex="23"
                data-l10n-id="pdfjs-zoom-select"
                data-dom-id="scaleSelect"
                class="scaleSelect"
              >
                <option
                  id="pageAutoOption"
                  title=""
                  value="auto"
                  selected="selected"
                  data-l10n-id="pdfjs-page-scale-auto"
                >
                  Automatic Zoom
                </option>
                <option
                  id="pageActualOption"
                  title=""
                  value="page-actual"
                  data-l10n-id="pdfjs-page-scale-actual"
                >
                  Actual Size
                </option>
                <option
                  id="pageFitOption"
                  title=""
                  value="page-fit"
                  data-l10n-id="pdfjs-page-scale-fit"
                >
                  Page Fit
                </option>
                <option
                  id="pageWidthOption"
                  title=""
                  value="page-width"
                  data-l10n-id="pdfjs-page-scale-width"
                >
                  Page Width
                </option>
                <option
                  id="customScaleOption"
                  title=""
                  value="custom"
                  disabled="disabled"
                  hidden="true"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 0 }'
                >
                  0%
                </option>
                <option
                  title=""
                  value="0.5"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 50 }'
                >
                  50%
                </option>
                <option
                  title=""
                  value="0.75"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 75 }'
                >
                  75%
                </option>
                <option
                  title=""
                  value="1"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 100 }'
                >
                  100%
                </option>
                <option
                  title=""
                  value="1.25"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 125 }'
                >
                  125%
                </option>
                <option
                  title=""
                  value="1.5"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 150 }'
                >
                  150%
                </option>
                <option
                  title=""
                  value="2"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 200 }'
                >
                  200%
                </option>
                <option
                  title=""
                  value="3"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 300 }'
                >
                  300%
                </option>
                <option
                  title=""
                  value="4"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 400 }'
                >
                  400%
                </option>
              </select></span
            >
          </div>
        </div>
        <div data-dom-id="loadingBar" class="loadingBar">
          <div class="progress"><div class="glimmer"></div></div>
        </div>
      </div>
    </div>
    <div tabindex="0" data-dom-id="viewerContainer" class="viewerContainer">
      <div data-dom-id="viewer" class="pdfViewer viewer"></div>
    </div>
  </div>
  <!-- mainContainer -->
  <div data-dom-id="dialogContainer" class="dialogContainer">
    <dialog data-dom-id="passwordDialog" class="passwordDialog">
      <div class="row"><!--Removed!--></div>
      <div class="row">
        <input
          type="password"
          data-dom-id="password"
          class="toolbarField password"
        />
      </div>
      <div class="buttonRow">
        <button
          data-dom-id="passwordCancel"
          class="dialogButton passwordCancel"
        >
          <span data-l10n-id="pdfjs-password-cancel-button"
            >Cancel</span
          ></button
        ><button
          data-dom-id="passwordSubmit"
          class="dialogButton passwordSubmit"
        >
          <span data-l10n-id="pdfjs-password-ok-button">OK</span>
        </button>
      </div>
    </dialog>
    <dialog
      data-dom-id="documentPropertiesDialog"
      class="documentPropertiesDialog"
    >
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-file-name"
          data-dom-id="fileNameLabel"
          class="fileNameLabel"
          >File name:</span
        >
        <p
          aria-labelledby="fileNameLabel"
          data-dom-id="fileNameField"
          class="fileNameField"
        >
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-file-size"
          data-dom-id="fileSizeLabel"
          class="fileSizeLabel"
          >File size:</span
        >
        <p
          aria-labelledby="fileSizeLabel"
          data-dom-id="fileSizeField"
          class="fileSizeField"
        >
          -
        </p>
      </div>
      <div class="separator"></div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-title"
          data-dom-id="titleLabel"
          class="titleLabel"
          >Title:</span
        >
        <p
          aria-labelledby="titleLabel"
          data-dom-id="titleField"
          class="titleField"
        >
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-author"
          data-dom-id="authorLabel"
          class="authorLabel"
          >Author:</span
        >
        <p
          aria-labelledby="authorLabel"
          data-dom-id="authorField"
          class="authorField"
        >
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-subject"
          data-dom-id="subjectLabel"
          class="subjectLabel"
          >Subject:</span
        >
        <p
          aria-labelledby="subjectLabel"
          data-dom-id="subjectField"
          class="subjectField"
        >
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-keywords"
          data-dom-id="keywordsLabel"
          class="keywordsLabel"
          >Keywords:</span
        >
        <p
          aria-labelledby="keywordsLabel"
          data-dom-id="keywordsField"
          class="keywordsField"
        >
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-creation-date"
          data-dom-id="creationDateLabel"
          class="creationDateLabel"
          >Creation Date:</span
        >
        <p
          aria-labelledby="creationDateLabel"
          data-dom-id="creationDateField"
          class="creationDateField"
        >
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-modification-date"
          data-dom-id="modificationDateLabel"
          class="modificationDateLabel"
          >Modification Date:</span
        >
        <p
          aria-labelledby="modificationDateLabel"
          data-dom-id="modificationDateField"
          class="modificationDateField"
        >
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-creator"
          data-dom-id="creatorLabel"
          class="creatorLabel"
          >Creator:</span
        >
        <p
          aria-labelledby="creatorLabel"
          data-dom-id="creatorField"
          class="creatorField"
        >
          -
        </p>
      </div>
      <div class="separator"></div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-producer"
          data-dom-id="producerLabel"
          class="producerLabel"
          >PDF Producer:</span
        >
        <p
          aria-labelledby="producerLabel"
          data-dom-id="producerField"
          class="producerField"
        >
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-version"
          data-dom-id="versionLabel"
          class="versionLabel"
          >PDF Version:</span
        >
        <p
          aria-labelledby="versionLabel"
          data-dom-id="versionField"
          class="versionField"
        >
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-page-count"
          data-dom-id="pageCountLabel"
          class="pageCountLabel"
          >Page Count:</span
        >
        <p
          aria-labelledby="pageCountLabel"
          data-dom-id="pageCountField"
          class="pageCountField"
        >
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-page-size"
          data-dom-id="pageSizeLabel"
          class="pageSizeLabel"
          >Page Size:</span
        >
        <p
          aria-labelledby="pageSizeLabel"
          data-dom-id="pageSizeField"
          class="pageSizeField"
        >
          -
        </p>
      </div>
      <div class="separator"></div>
      <div class="row">
        <span
          data-l10n-id="pdfjs-document-properties-linearized"
          data-dom-id="linearizedLabel"
          class="linearizedLabel"
          >Fast Web View:</span
        >
        <p
          aria-labelledby="linearizedLabel"
          data-dom-id="linearizedField"
          class="linearizedField"
        >
          -
        </p>
      </div>
      <div class="buttonRow">
        <button
          data-dom-id="documentPropertiesClose"
          class="dialogButton documentPropertiesClose"
        >
          <span data-l10n-id="pdfjs-document-properties-close-button"
            >Close</span
          >
        </button>
      </div>
    </dialog>
    <dialog
      aria-labelledby="dialogLabel"
      aria-describedby="dialogDescription"
      data-dom-id="altTextDialog"
      class="altTextDialog"
    >
      <div data-dom-id="altTextContainer" class="altTextContainer">
        <div data-dom-id="overallDescription" class="overallDescription">
          <span
            data-l10n-id="pdfjs-editor-alt-text-dialog-label"
            data-dom-id="dialogLabel"
            class="title dialogLabel"
            >Choose an option</span
          ><span
            data-l10n-id="pdfjs-editor-alt-text-dialog-description"
            data-dom-id="dialogDescription"
            class="dialogDescription"
          >
            Alt text (alternative text) helps when people can’t see the image or
            when it doesn’t load.
          </span>
        </div>
        <div data-dom-id="addDescription" class="addDescription">
          <div class="radio">
            <div class="radioButton">
              <label
                ><input
                  type="radio"
                  name="altTextOption"
                  tabindex="0"
                  aria-describedby="descriptionAreaLabel"
                  checked=""
                  data-dom-id="descriptionButton"
                  class="descriptionButton"
                /><span
                  class="toolbarLabel"
                  data-l10n-id="pdfjs-editor-alt-text-add-description-label"
                  >Add a description</span
                ></label
              ><!--Removed!-->
            </div>
            <div class="radioLabel">
              <span
                data-l10n-id="pdfjs-editor-alt-text-add-description-description"
                data-dom-id="descriptionAreaLabel"
                class="descriptionAreaLabel"
              >
                Aim for 1-2 sentences that describe the subject, setting, or
                actions.
              </span>
            </div>
          </div>
          <div class="descriptionArea">
            <textarea
              placeholder="For example, “A young man sits down at a table to eat a meal”"
              aria-labelledby="descriptionAreaLabel"
              data-l10n-id="pdfjs-editor-alt-text-textarea"
              tabindex="0"
              data-dom-id="descriptionTextarea"
              class="descriptionTextarea"
            ></textarea>
          </div>
        </div>
        <div data-dom-id="markAsDecorative" class="markAsDecorative">
          <div class="radio">
            <div class="radioButton">
              <label
                ><input
                  type="radio"
                  name="altTextOption"
                  aria-describedby="decorativeLabel"
                  data-dom-id="decorativeButton"
                  class="decorativeButton"
                /><span
                  class="toolbarLabel"
                  data-l10n-id="pdfjs-editor-alt-text-mark-decorative-label"
                  >Mark as decorative</span
                ></label
              ><!--Removed!-->
            </div>
            <div class="radioLabel">
              <span
                data-l10n-id="pdfjs-editor-alt-text-mark-decorative-description"
                data-dom-id="decorativeLabel"
                class="decorativeLabel"
              >
                This is used for ornamental images, like borders or watermarks.
              </span>
            </div>
          </div>
        </div>
        <div data-dom-id="buttons" class="buttons">
          <button
            tabindex="0"
            data-dom-id="altTextCancel"
            class="altTextCancel"
          >
            <span data-l10n-id="pdfjs-editor-alt-text-cancel-button"
              >Cancel</span
            ></button
          ><button tabindex="0" data-dom-id="altTextSave" class="altTextSave">
            <span data-l10n-id="pdfjs-editor-alt-text-save-button">Save</span>
          </button>
        </div>
      </div>
    </dialog>
    <!--#if !MOZCENTRAL-->
    <dialog
      style="min-width: 200px"
      data-dom-id="printServiceDialog"
      class="printServiceDialog"
    >
      <div class="row">
        <span data-l10n-id="pdfjs-print-progress-message"
          >Preparing document for printing…</span
        >
      </div>
      <div class="row">
        <progress value="0" max="100"></progress
        ><span
          data-l10n-id="pdfjs-print-progress-percent"
          data-l10n-args='{ "progress": 0 }'
          class="relative-progress"
          >0%</span
        >
      </div>
      <div class="buttonRow">
        <button data-dom-id="printCancel" class="dialogButton printCancel">
          <span data-l10n-id="pdfjs-print-progress-close-button">Cancel</span>
        </button>
      </div>
    </dialog>
    <!--#endif--><!--#if CHROME--><!--#include viewer-snippet-chrome-overlays.html--><!--#endif-->
  </div>
  <!-- dialogContainer -->
</div>
<!-- outerContainer -->
<div data-dom-id="printContainer" class="printContainer"></div>
<!--#if GENERIC--><input
  type="file"
  data-dom-id="fileInput"
  class="hidden fileInput"
/><!--#endif-->
`;

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
