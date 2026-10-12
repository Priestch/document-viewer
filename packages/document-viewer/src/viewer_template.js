const template = `
<div data-dom-id="outerContainer" class="outerContainer">
  <div data-dom-id="sidebarContainer" class="sidebarContainer">
    <div
      data-dom-id="toolbarSidebar"
      class="toolbarHorizontalGroup toolbarSidebar"
    >
      <div data-dom-id="toolbarSidebarLeft" class="toolbarSidebarLeft">
        <div
          role="radiogroup"
          data-dom-id="sidebarViewButtons"
          class="toolbarHorizontalGroup toggled sidebarViewButtons"
        >
          <button
            type="button"
            title="Show Thumbnails"
            tabindex="0"
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
            type="button"
            title="Show Document Outline (double-click to expand/collapse all items)"
            tabindex="0"
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
            type="button"
            title="Show Attachments"
            tabindex="0"
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
            type="button"
            title="Show Layers (double-click to reset all layers to the default state)"
            tabindex="0"
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
          class="toolbarHorizontalGroup outlineOptionsContainer"
        >
          <div class="verticalToolbarSeparator"></div>
          <button
            type="button"
            disabled="disabled"
            title="Find Current Outline Item"
            tabindex="0"
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
    <div class="toolbar">
      <div data-dom-id="toolbarContainer" class="toolbarContainer">
        <div
          data-dom-id="toolbarViewer"
          class="toolbarHorizontalGroup toolbarViewer"
        >
          <div
            data-dom-id="toolbarViewerLeft"
            class="toolbarHorizontalGroup toolbarViewerLeft"
          >
            <button
              type="button"
              title="Toggle Sidebar"
              tabindex="0"
              data-l10n-id="pdfjs-toggle-sidebar-button"
              aria-expanded="false"
              aria-haspopup="true"
              aria-controls="sidebarContainer"
              data-dom-id="sidebarToggleButton"
              class="toolbarButton sidebarToggleButton"
            >
              <span data-l10n-id="pdfjs-toggle-sidebar-button-label"
                >Toggle Sidebar</span
              >
            </button>
            <div class="toolbarButtonSpacer"></div>
            <div class="toolbarButtonWithContainer">
              <button
                type="button"
                title="Find in Document"
                tabindex="0"
                data-l10n-id="pdfjs-findbar-button"
                aria-expanded="false"
                aria-controls="findbar"
                data-dom-id="viewFindButton"
                class="toolbarButton viewFindButton"
              >
                <span data-l10n-id="pdfjs-findbar-button-label">Find</span>
              </button>
              <div
                data-dom-id="findbar"
                class="hidden doorHanger toolbarHorizontalGroup findbar"
              >
                <div
                  data-dom-id="findInputContainer"
                  class="toolbarHorizontalGroup findInputContainer"
                >
                  <span class="loadingInput end toolbarHorizontalGroup"
                    ><input
                      title="Find"
                      placeholder="Find in document…"
                      tabindex="0"
                      data-l10n-id="pdfjs-find-input"
                      aria-invalid="false"
                      data-dom-id="findInput"
                      class="toolbarField findInput"
                  /></span>
                  <div class="toolbarHorizontalGroup">
                    <button
                      type="button"
                      title="Find the previous occurrence of the phrase"
                      tabindex="0"
                      data-l10n-id="pdfjs-find-previous-button"
                      data-dom-id="findPreviousButton"
                      class="toolbarButton findPreviousButton"
                    >
                      <span data-l10n-id="pdfjs-find-previous-button-label"
                        >Previous</span
                      >
                    </button>
                    <div class="splitToolbarButtonSeparator"></div>
                    <button
                      type="button"
                      title="Find the next occurrence of the phrase"
                      tabindex="0"
                      data-l10n-id="pdfjs-find-next-button"
                      data-dom-id="findNextButton"
                      class="toolbarButton findNextButton"
                    >
                      <span data-l10n-id="pdfjs-find-next-button-label"
                        >Next</span
                      >
                    </button>
                  </div>
                </div>
                <div
                  data-dom-id="findbarOptionsOneContainer"
                  class="toolbarHorizontalGroup findbarOptionsOneContainer"
                >
                  <div class="toggleButton toolbarLabel">
                    <label
                      ><input
                        type="checkbox"
                        tabindex="0"
                        data-dom-id="findHighlightAll"
                        class="findHighlightAll"
                      /><span
                        class="toolbarLabel"
                        data-l10n-id="pdfjs-find-highlight-checkbox"
                        >Highlight All</span
                      ></label
                    ><!--Removed!-->
                  </div>
                  <div class="toggleButton toolbarLabel">
                    <label
                      ><input
                        type="checkbox"
                        tabindex="0"
                        data-dom-id="findMatchCase"
                        class="findMatchCase"
                      /><span
                        class="toolbarLabel"
                        data-l10n-id="pdfjs-find-match-case-checkbox-label"
                        >Match Case</span
                      ></label
                    ><!--Removed!-->
                  </div>
                </div>
                <div
                  data-dom-id="findbarOptionsTwoContainer"
                  class="toolbarHorizontalGroup findbarOptionsTwoContainer"
                >
                  <div class="toggleButton toolbarLabel">
                    <label
                      ><input
                        type="checkbox"
                        tabindex="0"
                        data-dom-id="findMatchDiacritics"
                        class="findMatchDiacritics"
                      /><span
                        class="toolbarLabel"
                        data-l10n-id="pdfjs-find-match-diacritics-checkbox-label"
                        >Match Diacritics</span
                      ></label
                    ><!--Removed!-->
                  </div>
                  <div class="toggleButton toolbarLabel">
                    <label
                      ><input
                        type="checkbox"
                        tabindex="0"
                        data-dom-id="findEntireWord"
                        class="findEntireWord"
                      /><span
                        class="toolbarLabel"
                        data-l10n-id="pdfjs-find-entire-word-checkbox-label"
                        >Whole Words</span
                      ></label
                    ><!--Removed!-->
                  </div>
                </div>
                <div
                  aria-live="polite"
                  data-dom-id="findbarMessageContainer"
                  class="toolbarHorizontalGroup findbarMessageContainer"
                >
                  <span
                    data-dom-id="findResultsCount"
                    class="toolbarLabel findResultsCount"
                  ></span
                  ><span
                    data-dom-id="findMsg"
                    class="toolbarLabel findMsg"
                  ></span>
                </div>
              </div>
              <!-- findbar -->
            </div>
            <div class="toolbarHorizontalGroup hiddenSmallView">
              <button
                title="Previous Page"
                type="button"
                tabindex="0"
                data-l10n-id="pdfjs-previous-button"
                data-dom-id="previous"
                class="toolbarButton previous"
              >
                <span data-l10n-id="pdfjs-previous-button-label">Previous</span>
              </button>
              <div class="splitToolbarButtonSeparator"></div>
              <button
                type="button"
                title="Next Page"
                tabindex="0"
                data-l10n-id="pdfjs-next-button"
                data-dom-id="next"
                class="toolbarButton next"
              >
                <span data-l10n-id="pdfjs-next-button-label">Next</span>
              </button>
            </div>
            <div class="toolbarHorizontalGroup">
              <span class="loadingInput start toolbarHorizontalGroup"
                ><input
                  type="number"
                  title="Page"
                  value="1"
                  min="1"
                  tabindex="0"
                  data-l10n-id="pdfjs-page-input"
                  autocomplete="off"
                  data-dom-id="pageNumber"
                  class="toolbarField pageNumber" /></span
              ><span
                data-dom-id="numPages"
                class="toolbarLabel numPages"
              ></span>
            </div>
          </div>
          <div
            data-dom-id="toolbarViewerMiddle"
            class="toolbarHorizontalGroup toolbarViewerMiddle"
          >
            <div class="toolbarHorizontalGroup">
              <button
                type="button"
                title="Zoom Out"
                tabindex="0"
                data-l10n-id="pdfjs-zoom-out-button"
                data-dom-id="zoomOutButton"
                class="toolbarButton zoomOutButton"
              >
                <span data-l10n-id="pdfjs-zoom-out-button-label">Zoom Out</span>
              </button>
              <div class="splitToolbarButtonSeparator"></div>
              <button
                type="button"
                title="Zoom In"
                tabindex="0"
                data-l10n-id="pdfjs-zoom-in-button"
                data-dom-id="zoomInButton"
                class="toolbarButton zoomInButton"
              >
                <span data-l10n-id="pdfjs-zoom-in-button-label">Zoom In</span>
              </button>
            </div>
            <span
              data-dom-id="scaleSelectContainer"
              class="dropdownToolbarButton scaleSelectContainer"
              ><select
                title="Zoom"
                tabindex="0"
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
          <div
            data-dom-id="toolbarViewerRight"
            class="toolbarHorizontalGroup toolbarViewerRight"
          >
            <div
              role="radiogroup"
              data-dom-id="editorModeButtons"
              class="toolbarHorizontalGroup editorModeButtons"
            >
              <div
                data-dom-id="editorHighlight"
                class="toolbarButtonWithContainer editorHighlight"
              >
                <button
                  type="button"
                  disabled="disabled"
                  title="Highlight"
                  role="radio"
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="editorHighlightParamsToolbar"
                  tabindex="0"
                  data-l10n-id="pdfjs-editor-highlight-button"
                  data-dom-id="editorHighlightButton"
                  class="toolbarButton editorHighlightButton"
                >
                  <span data-l10n-id="pdfjs-editor-highlight-button-label"
                    >Highlight</span
                  >
                </button>
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
                    <div
                      data-dom-id="editorHighlightThickness"
                      class="editorHighlightThickness"
                    >
                      <!--Removed!-->
                      <div class="thicknessPicker">
                        <input
                          type="range"
                          data-l10n-id="pdfjs-editor-free-highlight-thickness-title"
                          value="12"
                          min="8"
                          max="24"
                          step="1"
                          tabindex="0"
                          data-dom-id="editorFreeHighlightThickness"
                          class="editorParamsSlider editorFreeHighlightThickness"
                        />
                      </div>
                    </div>
                    <div
                      data-dom-id="editorHighlightVisibility"
                      class="editorHighlightVisibility"
                    >
                      <div class="divider"></div>
                      <div class="toggler">
                        <!--Removed!--><button
                          type="button"
                          data-l10n-id="pdfjs-editor-highlight-show-all-button"
                          aria-pressed="true"
                          tabindex="0"
                          data-dom-id="editorHighlightShowAll"
                          class="toggle-button editorHighlightShowAll"
                        ></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                data-dom-id="editorFreeText"
                class="toolbarButtonWithContainer editorFreeText"
              >
                <button
                  type="button"
                  disabled="disabled"
                  title="Text"
                  role="radio"
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="editorFreeTextParamsToolbar"
                  tabindex="0"
                  data-l10n-id="pdfjs-editor-free-text-button"
                  data-dom-id="editorFreeTextButton"
                  class="toolbarButton editorFreeTextButton"
                >
                  <span data-l10n-id="pdfjs-editor-free-text-button-label"
                    >Text</span
                  >
                </button>
                <div
                  data-dom-id="editorFreeTextParamsToolbar"
                  class="editorParamsToolbar hidden doorHangerRight editorFreeTextParamsToolbar"
                >
                  <div class="editorParamsToolbarContainer">
                    <div class="editorParamsSetter">
                      <!--Removed!--><label
                        ><input
                          type="color"
                          tabindex="0"
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
                          tabindex="0"
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
              </div>
              <div
                data-dom-id="editorInk"
                class="toolbarButtonWithContainer editorInk"
              >
                <button
                  type="button"
                  disabled="disabled"
                  title="Draw"
                  role="radio"
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="editorInkParamsToolbar"
                  tabindex="0"
                  data-l10n-id="pdfjs-editor-ink-button"
                  data-dom-id="editorInkButton"
                  class="toolbarButton editorInkButton"
                >
                  <span data-l10n-id="pdfjs-editor-ink-button-label">Draw</span>
                </button>
                <div
                  data-dom-id="editorInkParamsToolbar"
                  class="editorParamsToolbar hidden doorHangerRight editorInkParamsToolbar"
                >
                  <div class="editorParamsToolbarContainer">
                    <div class="editorParamsSetter">
                      <!--Removed!--><label
                        ><input
                          type="color"
                          tabindex="0"
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
                          tabindex="0"
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
                          value="1"
                          min="0.05"
                          max="1"
                          step="0.05"
                          tabindex="0"
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
              </div>
              <div
                data-dom-id="editorStamp"
                class="toolbarButtonWithContainer editorStamp"
              >
                <button
                  type="button"
                  disabled="disabled"
                  title="Add or edit images"
                  role="radio"
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="editorStampParamsToolbar"
                  tabindex="0"
                  data-l10n-id="pdfjs-editor-stamp-button"
                  data-dom-id="editorStampButton"
                  class="toolbarButton editorStampButton"
                >
                  <span data-l10n-id="pdfjs-editor-stamp-button-label"
                    >Add or edit images</span
                  >
                </button>
                <div
                  data-dom-id="editorStampParamsToolbar"
                  class="editorParamsToolbar hidden doorHangerRight menu editorStampParamsToolbar"
                >
                  <div class="menuContainer">
                    <button
                      type="button"
                      title="Add image"
                      tabindex="0"
                      data-l10n-id="pdfjs-editor-stamp-add-image-button"
                      data-dom-id="editorStampAddImage"
                      class="toolbarButton labeled editorStampAddImage"
                    >
                      <span
                        class="editorParamsLabel"
                        data-l10n-id="pdfjs-editor-stamp-add-image-button-label"
                        >Add image</span
                      >
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div
              data-dom-id="editorModeSeparator"
              class="verticalToolbarSeparator editorModeSeparator"
            ></div>
            <div class="toolbarHorizontalGroup hiddenMediumView">
              <button
                type="button"
                title="Print"
                tabindex="0"
                data-l10n-id="pdfjs-print-button"
                data-dom-id="printButton"
                class="toolbarButton printButton"
              >
                <span data-l10n-id="pdfjs-print-button-label"
                  >Print</span
                ></button
              ><button
                type="button"
                title="Save"
                tabindex="0"
                data-l10n-id="pdfjs-save-button"
                data-dom-id="downloadButton"
                class="toolbarButton downloadButton"
              >
                <span data-l10n-id="pdfjs-save-button-label">Save</span>
              </button>
            </div>
            <div class="verticalToolbarSeparator hiddenMediumView"></div>
            <div
              data-dom-id="secondaryToolbarToggle"
              class="toolbarButtonWithContainer secondaryToolbarToggle"
            >
              <button
                type="button"
                title="Tools"
                tabindex="0"
                data-l10n-id="pdfjs-tools-button"
                aria-expanded="false"
                aria-haspopup="true"
                aria-controls="secondaryToolbar"
                data-dom-id="secondaryToolbarToggleButton"
                class="toolbarButton secondaryToolbarToggleButton"
              >
                <span data-l10n-id="pdfjs-tools-button-label">Tools</span>
              </button>
              <div
                data-dom-id="secondaryToolbar"
                class="hidden doorHangerRight menu secondaryToolbar"
              >
                <div
                  data-dom-id="secondaryToolbarButtonContainer"
                  class="menuContainer secondaryToolbarButtonContainer"
                >
                  <!--#if GENERIC--><button
                    type="button"
                    title="Open File"
                    tabindex="0"
                    data-l10n-id="pdfjs-open-file-button"
                    data-dom-id="secondaryOpenFile"
                    class="toolbarButton labeled secondaryOpenFile"
                  >
                    <span data-l10n-id="pdfjs-open-file-button-label"
                      >Open</span
                    ></button
                  ><!--#endif-->
                  <div class="visibleMediumView">
                    <button
                      type="button"
                      title="Print"
                      tabindex="0"
                      data-l10n-id="pdfjs-print-button"
                      data-dom-id="secondaryPrint"
                      class="toolbarButton labeled secondaryPrint"
                    >
                      <span data-l10n-id="pdfjs-print-button-label"
                        >Print</span
                      ></button
                    ><button
                      type="button"
                      title="Save"
                      tabindex="0"
                      data-l10n-id="pdfjs-save-button"
                      data-dom-id="secondaryDownload"
                      class="toolbarButton labeled secondaryDownload"
                    >
                      <span data-l10n-id="pdfjs-save-button-label"
                        >Save</span
                      ></button
                    ><!--#if !GENERIC--><!--            <div class="horizontalToolbarSeparator"></div>--><!--#endif-->
                  </div>
                  <!--#if GENERIC-->
                  <div class="horizontalToolbarSeparator"></div>
                  <!--#endif--><button
                    type="button"
                    title="Switch to Presentation Mode"
                    tabindex="0"
                    data-l10n-id="pdfjs-presentation-mode-button"
                    data-dom-id="presentationMode"
                    class="toolbarButton labeled presentationMode"
                  >
                    <span data-l10n-id="pdfjs-presentation-mode-button-label"
                      >Presentation Mode</span
                    ></button
                  ><a
                    href="#"
                    title="Current Page (View URL from Current Page)"
                    tabindex="0"
                    data-l10n-id="pdfjs-bookmark-button"
                    data-dom-id="viewBookmark"
                    class="toolbarButton labeled viewBookmark"
                    ><span data-l10n-id="pdfjs-bookmark-button-label"
                      >Current Page</span
                    ></a
                  >
                  <div
                    data-dom-id="viewBookmarkSeparator"
                    class="horizontalToolbarSeparator viewBookmarkSeparator"
                  ></div>
                  <button
                    type="button"
                    title="Go to First Page"
                    tabindex="0"
                    data-l10n-id="pdfjs-first-page-button"
                    data-dom-id="firstPage"
                    class="toolbarButton labeled firstPage"
                  >
                    <span data-l10n-id="pdfjs-first-page-button-label"
                      >Go to First Page</span
                    ></button
                  ><button
                    type="button"
                    title="Go to Last Page"
                    tabindex="0"
                    data-l10n-id="pdfjs-last-page-button"
                    data-dom-id="lastPage"
                    class="toolbarButton labeled lastPage"
                  >
                    <span data-l10n-id="pdfjs-last-page-button-label"
                      >Go to Last Page</span
                    >
                  </button>
                  <div class="horizontalToolbarSeparator"></div>
                  <button
                    type="button"
                    title="Rotate Clockwise"
                    tabindex="0"
                    data-l10n-id="pdfjs-page-rotate-cw-button"
                    data-dom-id="pageRotateCw"
                    class="toolbarButton labeled pageRotateCw"
                  >
                    <span data-l10n-id="pdfjs-page-rotate-cw-button-label"
                      >Rotate Clockwise</span
                    ></button
                  ><button
                    type="button"
                    title="Rotate Counterclockwise"
                    tabindex="0"
                    data-l10n-id="pdfjs-page-rotate-ccw-button"
                    data-dom-id="pageRotateCcw"
                    class="toolbarButton labeled pageRotateCcw"
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
                      type="button"
                      title="Enable Text Selection Tool"
                      tabindex="0"
                      data-l10n-id="pdfjs-cursor-text-select-tool-button"
                      role="radio"
                      aria-checked="true"
                      data-dom-id="cursorSelectTool"
                      class="toolbarButton labeled toggled cursorSelectTool"
                    >
                      <span
                        data-l10n-id="pdfjs-cursor-text-select-tool-button-label"
                        >Text Selection Tool</span
                      ></button
                    ><button
                      type="button"
                      title="Enable Hand Tool"
                      tabindex="0"
                      data-l10n-id="pdfjs-cursor-hand-tool-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="cursorHandTool"
                      class="toolbarButton labeled cursorHandTool"
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
                      type="button"
                      title="Use Page Scrolling"
                      tabindex="0"
                      data-l10n-id="pdfjs-scroll-page-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="scrollPage"
                      class="toolbarButton labeled scrollPage"
                    >
                      <span data-l10n-id="pdfjs-scroll-page-button-label"
                        >Page Scrolling</span
                      ></button
                    ><button
                      type="button"
                      title="Use Vertical Scrolling"
                      tabindex="0"
                      data-l10n-id="pdfjs-scroll-vertical-button"
                      role="radio"
                      aria-checked="true"
                      data-dom-id="scrollVertical"
                      class="toolbarButton labeled toggled scrollVertical"
                    >
                      <span data-l10n-id="pdfjs-scroll-vertical-button-label"
                        >Vertical Scrolling</span
                      ></button
                    ><button
                      type="button"
                      title="Use Horizontal Scrolling"
                      tabindex="0"
                      data-l10n-id="pdfjs-scroll-horizontal-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="scrollHorizontal"
                      class="toolbarButton labeled scrollHorizontal"
                    >
                      <span data-l10n-id="pdfjs-scroll-horizontal-button-label"
                        >Horizontal Scrolling</span
                      ></button
                    ><button
                      type="button"
                      title="Use Wrapped Scrolling"
                      tabindex="0"
                      data-l10n-id="pdfjs-scroll-wrapped-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="scrollWrapped"
                      class="toolbarButton labeled scrollWrapped"
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
                      type="button"
                      title="Do not join page spreads"
                      tabindex="0"
                      data-l10n-id="pdfjs-spread-none-button"
                      role="radio"
                      aria-checked="true"
                      data-dom-id="spreadNone"
                      class="toolbarButton labeled toggled spreadNone"
                    >
                      <span data-l10n-id="pdfjs-spread-none-button-label"
                        >No Spreads</span
                      ></button
                    ><button
                      type="button"
                      title="Join page spreads starting with odd-numbered pages"
                      tabindex="0"
                      data-l10n-id="pdfjs-spread-odd-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="spreadOdd"
                      class="toolbarButton labeled spreadOdd"
                    >
                      <span data-l10n-id="pdfjs-spread-odd-button-label"
                        >Odd Spreads</span
                      ></button
                    ><button
                      type="button"
                      title="Join page spreads starting with even-numbered pages"
                      tabindex="0"
                      data-l10n-id="pdfjs-spread-even-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="spreadEven"
                      class="toolbarButton labeled spreadEven"
                    >
                      <span data-l10n-id="pdfjs-spread-even-button-label"
                        >Even Spreads</span
                      >
                    </button>
                  </div>
                  <div
                    data-dom-id="imageAltTextSettingsSeparator"
                    class="horizontalToolbarSeparator hidden imageAltTextSettingsSeparator"
                  ></div>
                  <button
                    type="button"
                    title="Image alt text settings"
                    tabindex="0"
                    data-l10n-id="pdfjs-image-alt-text-settings-button"
                    aria-controls="altTextSettingsDialog"
                    data-dom-id="imageAltTextSettings"
                    class="toolbarButton labeled hidden imageAltTextSettings"
                  >
                    <span
                      data-l10n-id="pdfjs-image-alt-text-settings-button-label"
                      >Image alt text settings</span
                    >
                  </button>
                  <div class="horizontalToolbarSeparator"></div>
                  <button
                    type="button"
                    title="Document Properties…"
                    tabindex="0"
                    data-l10n-id="pdfjs-document-properties-button"
                    aria-controls="documentPropertiesDialog"
                    data-dom-id="documentProperties"
                    class="toolbarButton labeled documentProperties"
                  >
                    <span data-l10n-id="pdfjs-document-properties-button-label"
                      >Document Properties…</span
                    >
                  </button>
                </div>
              </div>
              <!-- secondaryToolbar -->
            </div>
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
          type="button"
          data-dom-id="passwordCancel"
          class="dialogButton passwordCancel"
        >
          <span data-l10n-id="pdfjs-password-cancel-button"
            >Cancel</span
          ></button
        ><button
          type="button"
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
          type="button"
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
      class="dialog altText altTextDialog"
    >
      <div
        data-dom-id="altTextContainer"
        class="mainContainer altTextContainer"
      >
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
            type="button"
            tabindex="0"
            data-dom-id="altTextCancel"
            class="secondaryButton altTextCancel"
          >
            <span data-l10n-id="pdfjs-editor-alt-text-cancel-button"
              >Cancel</span
            ></button
          ><button
            type="button"
            tabindex="0"
            data-dom-id="altTextSave"
            class="primaryButton altTextSave"
          >
            <span data-l10n-id="pdfjs-editor-alt-text-save-button">Save</span>
          </button>
        </div>
      </div>
    </dialog>
    <dialog
      aria-labelledby="newAltTextTitle"
      aria-describedby="newAltTextDescription"
      tabindex="0"
      data-dom-id="newAltTextDialog"
      class="dialog newAltText newAltTextDialog"
    >
      <div
        data-dom-id="newAltTextContainer"
        class="mainContainer newAltTextContainer"
      >
        <div class="title">
          <span
            data-l10n-id="pdfjs-editor-new-alt-text-dialog-edit-label"
            role="sectionhead"
            tabindex="0"
            data-dom-id="newAltTextTitle"
            class="newAltTextTitle"
            >Edit alt text (image description)</span
          >
        </div>
        <div data-dom-id="mainContent" class="mainContent">
          <div
            data-dom-id="descriptionAndSettings"
            class="descriptionAndSettings"
          >
            <div
              data-dom-id="descriptionInstruction"
              class="descriptionInstruction"
            >
              <div
                data-dom-id="newAltTextDescriptionContainer"
                class="newAltTextDescriptionContainer"
              >
                <div
                  class="altTextSpinner"
                  role="status"
                  aria-live="polite"
                ></div>
                <textarea
                  placeholder="Write your description here…"
                  aria-labelledby="descriptionAreaLabel"
                  data-l10n-id="pdfjs-editor-new-alt-text-textarea"
                  tabindex="0"
                  data-dom-id="newAltTextDescriptionTextarea"
                  class="newAltTextDescriptionTextarea"
                ></textarea>
              </div>
              <span
                role="note"
                data-l10n-id="pdfjs-editor-new-alt-text-description"
                data-dom-id="newAltTextDescription"
                class="newAltTextDescription"
                >Short description for people who can’t see the image or when
                the image doesn’t load.</span
              >
              <div
                role="note"
                data-dom-id="newAltTextDisclaimer"
                class="newAltTextDisclaimer"
              >
                <div>
                  <span data-l10n-id="pdfjs-editor-new-alt-text-disclaimer1"
                    >This alt text was created automatically and may be
                    inaccurate.</span
                  ><a
                    href="https://support.mozilla.org/en-US/kb/pdf-alt-text"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-l10n-id="pdfjs-editor-new-alt-text-disclaimer-learn-more-url"
                    tabindex="0"
                    data-dom-id="newAltTextLearnMore"
                    class="newAltTextLearnMore"
                    >Learn more</a
                  >
                </div>
              </div>
            </div>
            <div
              data-dom-id="newAltTextCreateAutomatically"
              class="toggler newAltTextCreateAutomatically"
            >
              <button
                type="button"
                aria-pressed="true"
                tabindex="0"
                data-dom-id="newAltTextCreateAutomaticallyButton"
                class="toggle-button newAltTextCreateAutomaticallyButton"
              ></button
              ><!--Removed!-->
            </div>
            <div
              data-dom-id="newAltTextDownloadModel"
              class="hidden newAltTextDownloadModel"
            >
              <span
                data-l10n-id="pdfjs-editor-new-alt-text-ai-model-downloading-progress"
                aria-valuemin="0"
                data-l10n-args='{ "totalSize": 0, "downloadedSize": 0 }'
                data-dom-id="newAltTextDownloadModelDescription"
                class="newAltTextDownloadModelDescription"
                >Downloading alt text AI model (0 of 0 MB)</span
              >
            </div>
          </div>
          <div
            data-dom-id="newAltTextImagePreview"
            class="newAltTextImagePreview"
          ></div>
        </div>
        <div data-dom-id="newAltTextError" class="messageBar newAltTextError">
          <div>
            <div>
              <span
                class="title"
                data-l10n-id="pdfjs-editor-new-alt-text-error-title"
                >Couldn’t create alt text automatically</span
              ><span
                class="description"
                data-l10n-id="pdfjs-editor-new-alt-text-error-description"
                >Please write your own alt text or try again later.</span
              >
            </div>
            <button
              type="button"
              tabindex="0"
              title="Close"
              data-dom-id="newAltTextCloseButton"
              class="closeButton newAltTextCloseButton"
            >
              <span data-l10n-id="pdfjs-editor-new-alt-text-error-close-button"
                >Close</span
              >
            </button>
          </div>
        </div>
        <div
          data-dom-id="newAltTextButtons"
          class="dialogButtonsGroup newAltTextButtons"
        >
          <button
            type="button"
            tabindex="0"
            data-dom-id="newAltTextCancel"
            class="secondaryButton hidden newAltTextCancel"
          >
            <span data-l10n-id="pdfjs-editor-alt-text-cancel-button"
              >Cancel</span
            ></button
          ><button
            type="button"
            tabindex="0"
            data-dom-id="newAltTextNotNow"
            class="secondaryButton newAltTextNotNow"
          >
            <span data-l10n-id="pdfjs-editor-new-alt-text-not-now-button"
              >Not now</span
            ></button
          ><button
            type="button"
            tabindex="0"
            data-dom-id="newAltTextSave"
            class="primaryButton newAltTextSave"
          >
            <span data-l10n-id="pdfjs-editor-alt-text-save-button">Save</span>
          </button>
        </div>
      </div>
    </dialog>
    <dialog
      aria-labelledby="altTextSettingsTitle"
      data-dom-id="altTextSettingsDialog"
      class="dialog altTextSettingsDialog"
    >
      <div
        data-dom-id="altTextSettingsContainer"
        class="mainContainer altTextSettingsContainer"
      >
        <div class="title">
          <span
            data-l10n-id="pdfjs-editor-alt-text-settings-dialog-label"
            role="sectionhead"
            tabindex="0"
            data-dom-id="altTextSettingsTitle"
            class="title altTextSettingsTitle"
            >Image alt text settings</span
          >
        </div>
        <div data-dom-id="automaticAltText" class="automaticAltText">
          <span data-l10n-id="pdfjs-editor-alt-text-settings-automatic-title"
            >Automatic alt text</span
          >
          <div data-dom-id="automaticSettings" class="automaticSettings">
            <div data-dom-id="createModelSetting" class="createModelSetting">
              <div class="toggler">
                <button
                  type="button"
                  aria-pressed="true"
                  tabindex="0"
                  data-dom-id="createModelButton"
                  class="toggle-button createModelButton"
                ></button
                ><!--Removed!-->
              </div>
              <div
                data-dom-id="createModelDescription"
                class="description createModelDescription"
              >
                <span
                  data-l10n-id="pdfjs-editor-alt-text-settings-create-model-description"
                  >Suggests descriptions to help people who can’t see the image
                  or when the image doesn’t load.</span
                ><a
                  href="https://support.mozilla.org/en-US/kb/pdf-alt-text"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-l10n-id="pdfjs-editor-new-alt-text-disclaimer-learn-more-url"
                  tabindex="0"
                  data-dom-id="altTextSettingsLearnMore"
                  class="altTextSettingsLearnMore"
                  >Learn more</a
                >
              </div>
            </div>
            <div data-dom-id="aiModelSettings" class="aiModelSettings">
              <div>
                <span
                  data-l10n-id="pdfjs-editor-alt-text-settings-download-model-label"
                  data-l10n-args='{ "totalSize": 180 }'
                  >Alt text AI model (180MB)</span
                >
                <div
                  data-dom-id="aiModelDescription"
                  class="description aiModelDescription"
                >
                  <span
                    data-l10n-id="pdfjs-editor-alt-text-settings-ai-model-description"
                    >Runs locally on your device so your data stays private.
                    Required for automatic alt text.</span
                  >
                </div>
              </div>
              <button
                type="button"
                tabindex="0"
                data-dom-id="deleteModelButton"
                class="secondaryButton deleteModelButton"
              >
                <span
                  data-l10n-id="pdfjs-editor-alt-text-settings-delete-model-button"
                  >Delete</span
                ></button
              ><button
                type="button"
                tabindex="0"
                data-dom-id="downloadModelButton"
                class="secondaryButton downloadModelButton"
              >
                <span
                  data-l10n-id="pdfjs-editor-alt-text-settings-download-model-button"
                  >Download</span
                >
              </button>
            </div>
          </div>
        </div>
        <div class="dialogSeparator"></div>
        <div data-dom-id="altTextEditor" class="altTextEditor">
          <span data-l10n-id="pdfjs-editor-alt-text-settings-editor-title"
            >Alt text editor</span
          >
          <div data-dom-id="showAltTextEditor" class="showAltTextEditor">
            <div class="toggler">
              <button
                type="button"
                aria-pressed="true"
                tabindex="0"
                data-dom-id="showAltTextDialogButton"
                class="toggle-button showAltTextDialogButton"
              ></button
              ><!--Removed!-->
            </div>
            <div
              data-dom-id="showAltTextDialogDescription"
              class="description showAltTextDialogDescription"
            >
              <span
                data-l10n-id="pdfjs-editor-alt-text-settings-show-dialog-description"
                >Helps you make sure all your images have alt text.</span
              >
            </div>
          </div>
        </div>
        <div data-dom-id="buttons" class="dialogButtonsGroup buttons">
          <button
            type="button"
            tabindex="0"
            data-dom-id="altTextSettingsCloseButton"
            class="primaryButton altTextSettingsCloseButton"
          >
            <span data-l10n-id="pdfjs-editor-alt-text-settings-close-button"
              >Close</span
            >
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
        <button
          type="button"
          data-dom-id="printCancel"
          class="dialogButton printCancel"
        >
          <span data-l10n-id="pdfjs-print-progress-close-button">Cancel</span>
        </button>
      </div>
    </dialog>
    <!--#endif--><!--#if CHROME--><!--#include viewer-snippet-chrome-overlays.html--><!--#endif-->
  </div>
  <!-- dialogContainer -->
  <div
    role="status"
    aria-labelledby="editorUndoBarMessage"
    tabindex="-1"
    hidden=""
    data-dom-id="editorUndoBar"
    class="messageBar editorUndoBar"
  >
    <div>
      <div>
        <span
          data-dom-id="editorUndoBarMessage"
          class="description editorUndoBarMessage"
        ></span>
      </div>
      <button
        type="button"
        tabindex="0"
        title="Undo"
        data-l10n-id="pdfjs-editor-undo-bar-undo-button"
        data-dom-id="editorUndoBarUndoButton"
        class="undoButton editorUndoBarUndoButton"
      >
        <span data-l10n-id="pdfjs-editor-undo-bar-undo-button-label"
          >Undo</span
        ></button
      ><button
        type="button"
        tabindex="0"
        title="Close"
        data-l10n-id="pdfjs-editor-undo-bar-close-button"
        data-dom-id="editorUndoBarCloseButton"
        class="closeButton editorUndoBarCloseButton"
      >
        <span data-l10n-id="pdfjs-editor-undo-bar-close-button-label"
          >Close</span
        >
      </button>
    </div>
  </div>
  <!-- editorUndoBar -->
</div>
<!-- outerContainer -->
<div data-dom-id="printContainer" class="printContainer"></div>
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
