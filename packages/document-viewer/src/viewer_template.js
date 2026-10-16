import { decorateReaderShell } from "./reader_shell.js";

const template = `
<div data-dom-id="outerContainer" class="outerContainer">
  <span
    role="alert"
    data-dom-id="viewer-alert"
    class="visuallyHidden viewer-alert"
  ></span>
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
              tabindex="0"
              data-l10n-id="pdfjs-toggle-views-manager-button1"
              aria-expanded="false"
              aria-haspopup="true"
              aria-controls="viewsManager"
              data-dom-id="viewsManagerToggleButton"
              class="toolbarButton viewsManagerToggleButton"
            >
              <span
                data-l10n-id="pdfjs-toggle-views-manager-button1-label"
              ></span>
            </button>
            <div
              hidden="true"
              role="dialog"
              aria-describedby="viewsManagerHeaderLabel"
              data-l10n-id="pdfjs-views-manager-sidebar"
              data-dom-id="viewsManager"
              class="menuContainer sidebar viewsManager"
            >
              <div data-dom-id="viewsManagerHeader" class="viewsManagerHeader">
                <div data-dom-id="viewsManagerTitle" class="viewsManagerTitle">
                  <div
                    data-dom-id="viewsManagerSelector"
                    class="viewsManagerSelector"
                  >
                    <button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-views-manager-view-selector-button"
                      aria-expanded="false"
                      aria-haspopup="listbox"
                      aria-controls="viewsManagerSelectorOptions"
                      data-dom-id="viewsManagerSelectorButton"
                      class="toolbarButton viewsManagerButton hasPopupMenu viewsManagerSelectorButton"
                    >
                      <span
                        data-l10n-id="pdfjs-views-manager-view-selector-button-label"
                      ></span></button
                    ><menu
                      id="viewsManagerSelectorOptions"
                      role="listbox"
                      class="popupMenu withMark"
                      ><button
                        role="option"
                        type="button"
                        tabindex="-1"
                        data-dom-id="thumbnailsViewMenu"
                        class="thumbnailsViewMenu"
                      >
                        <span
                          data-l10n-id="pdfjs-views-manager-pages-option-label"
                        ></span></button
                      ><button
                        role="option"
                        type="button"
                        tabindex="-1"
                        data-dom-id="outlinesViewMenu"
                        class="outlinesViewMenu"
                      >
                        <span
                          data-l10n-id="pdfjs-views-manager-outlines-option-label"
                        ></span></button
                      ><button
                        role="option"
                        type="button"
                        tabindex="-1"
                        data-dom-id="attachmentsViewMenu"
                        class="attachmentsViewMenu"
                      >
                        <span
                          data-l10n-id="pdfjs-views-manager-attachments-option-label"
                        ></span></button
                      ><button
                        role="option"
                        type="button"
                        tabindex="-1"
                        data-dom-id="layersViewMenu"
                        class="layersViewMenu"
                      >
                        <span
                          data-l10n-id="pdfjs-views-manager-layers-option-label"
                        ></span></button
                    ></menu>
                  </div>
                  <span
                    role="heading"
                    aria-level="2"
                    data-dom-id="viewsManagerHeaderLabel"
                    class="viewsManagerLabel viewsManagerHeaderLabel"
                  ></span
                  ><button
                    type="button"
                    tabindex="0"
                    data-l10n-id="pdfjs-views-manager-add-file-button"
                    hidden="true"
                    data-dom-id="viewsManagerAddFileButton"
                    class="toolbarButton viewsManagerButton viewsManagerAddFileButton"
                  >
                    <span
                      data-l10n-id="pdfjs-views-manager-add-file-button-label"
                    ></span
                    ><input
                      type="file"
                      accept="application/pdf"
                      data-dom-id="viewsManagerAddFilePicker"
                      class="viewsManagerAddFilePicker"
                    /></button
                  ><button
                    type="button"
                    tabindex="0"
                    data-l10n-id="pdfjs-current-outline-item-button"
                    hidden="true"
                    data-dom-id="viewsManagerCurrentOutlineButton"
                    class="toolbarButton viewsManagerButton viewsManagerCurrentOutlineButton"
                  >
                    <span
                      data-l10n-id="pdfjs-current-outline-item-button-label"
                    ></span>
                  </button>
                </div>
                <div
                  data-dom-id="viewsManagerStatus"
                  class="viewsManagerStatus"
                >
                  <div
                    data-dom-id="viewsManagerStatusAction"
                    class="viewsManagerStatusAction"
                  >
                    <span
                      data-dom-id="viewsManagerStatusActionLabelContainer"
                      class="viewsManagerStatusLabel viewsManagerStatusActionLabelContainer"
                      ><button
                        type="button"
                        tabindex="0"
                        role="checkbox"
                        aria-checked="true"
                        aria-labelledby="viewsManagerStatusActionLabel"
                        data-dom-id="viewsManagerStatusActionDeselectButton"
                        class="hidden viewsManagerStatusActionDeselectButton"
                      ></button
                      ><span
                        data-l10n-id="pdfjs-views-manager-pages-status-none-action-label"
                        data-dom-id="viewsManagerStatusActionLabel"
                        class="viewsManagerStatusLabel viewsManagerStatusActionLabel"
                      ></span
                    ></span>
                    <div data-dom-id="actionSelector" class="actionSelector">
                      <button
                        type="button"
                        tabindex="0"
                        aria-haspopup="menu"
                        aria-controls="viewsManagerStatusActionOptions"
                        aria-expanded="false"
                        data-dom-id="viewsManagerStatusActionButton"
                        class="viewsManagerButton hasPopupMenu viewsManagerStatusActionButton"
                      >
                        <span
                          data-l10n-id="pdfjs-views-manager-pages-status-action-button-label"
                        ></span></button
                      ><menu
                        id="viewsManagerStatusActionOptions"
                        class="popupMenu"
                        ><button
                          role="menuitem"
                          type="button"
                          tabindex="-1"
                          disabled=""
                          data-dom-id="viewsManagerStatusActionCopy"
                          class="noIcon viewsManagerStatusActionCopy"
                        >
                          <span
                            data-l10n-id="pdfjs-views-manager-pages-status-copy-button-label"
                          ></span></button
                        ><button
                          role="menuitem"
                          type="button"
                          tabindex="-1"
                          disabled=""
                          data-dom-id="viewsManagerStatusActionCut"
                          class="noIcon viewsManagerStatusActionCut"
                        >
                          <span
                            data-l10n-id="pdfjs-views-manager-pages-status-cut-button-label"
                          ></span></button
                        ><button
                          role="menuitem"
                          type="button"
                          tabindex="-1"
                          disabled=""
                          data-dom-id="viewsManagerStatusActionDelete"
                          class="noIcon viewsManagerStatusActionDelete"
                        >
                          <span
                            data-l10n-id="pdfjs-views-manager-pages-status-delete-button-label"
                          ></span></button
                        ><button
                          role="menuitem"
                          type="button"
                          tabindex="-1"
                          disabled=""
                          data-dom-id="viewsManagerStatusActionExport"
                          class="noIcon viewsManagerStatusActionExport"
                        >
                          <span
                            data-l10n-id="pdfjs-views-manager-pages-status-export-selected-button-label"
                          ></span></button
                      ></menu>
                    </div>
                  </div>
                  <div
                    data-dom-id="viewsManagerStatusUndo"
                    class="hidden viewsManagerStatusUndo"
                  >
                    <span
                      data-dom-id="viewsManagerStatusUndoLabel"
                      class="viewsManagerStatusLabel viewsManagerStatusUndoLabel"
                    ></span>
                    <div>
                      <button
                        type="button"
                        tabindex="0"
                        data-dom-id="viewsManagerStatusUndoButton"
                        class="viewsManagerButton viewsManagerStatusUndoButton"
                      >
                        <span
                          data-l10n-id="pdfjs-views-manager-status-undo-button-label"
                        ></span></button
                      ><button
                        type="button"
                        tabindex="0"
                        data-l10n-id="pdfjs-views-manager-status-close-button"
                        data-dom-id="viewsManagerStatusUndoCloseButton"
                        class="toolbarButton viewsManagerButton viewsCloseButton viewsManagerStatusUndoCloseButton"
                      >
                        <span
                          data-l10n-id="pdfjs-views-manager-status-close-button-label"
                        ></span>
                      </button>
                    </div>
                  </div>
                  <div
                    data-dom-id="viewsManagerStatusWarning"
                    class="hidden viewsManagerStatusWarning"
                  >
                    <span
                      data-dom-id="viewsManagerStatusWarningLabel"
                      class="viewsManagerStatusLabel viewsManagerStatusWarningLabel"
                    ></span
                    ><button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-views-manager-status-close-button"
                      data-dom-id="viewsManagerStatusWarningCloseButton"
                      class="toolbarButton viewsManagerButton viewsCloseButton viewsManagerStatusWarningCloseButton"
                    >
                      <span
                        data-l10n-id="pdfjs-views-manager-status-close-button-label"
                      ></span>
                    </button>
                  </div>
                  <div
                    data-dom-id="viewsManagerStatusWaiting"
                    class="hidden viewsManagerStatusWaiting"
                  >
                    <span
                      data-dom-id="viewsManagerStatusWaitingLabel"
                      class="viewsManagerStatusLabel viewsManagerStatusWaitingLabel"
                    ></span
                    ><button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-views-manager-status-close-button"
                      data-dom-id="viewsManagerStatusWaitingCloseButton"
                      class="toolbarButton viewsManagerButton viewsCloseButton viewsManagerStatusWaitingCloseButton"
                    >
                      <span
                        data-l10n-id="pdfjs-views-manager-status-close-button-label"
                      ></span>
                    </button>
                  </div>
                </div>
              </div>
              <div
                tabindex="-1"
                data-dom-id="viewsManagerContent"
                class="viewsManagerContent"
              >
                <div
                  class="thumbnailsView hidden"
                  tabindex="-1"
                  data-dom-id="thumbnailsView"
                ></div>
                <div
                  data-dom-id="outlinesView"
                  class="treeView hidden outlinesView"
                ></div>
                <div
                  data-dom-id="attachmentsView"
                  class="hidden attachmentsView"
                ></div>
                <div
                  data-dom-id="layersView"
                  class="treeView hidden layersView"
                ></div>
              </div>
              <div
                role="separator"
                aria-controls="viewsManager"
                tabindex="0"
                data-l10n-id="pdfjs-views-manager-sidebar-resizer"
                data-dom-id="viewsManagerResizer"
                class="sidebarResizer viewsManagerResizer"
              ></div>
            </div>
            <!-- sidebarContainer -->
            <div class="toolbarButtonSpacer"></div>
            <div class="toolbarButtonWithContainer">
              <button
                type="button"
                tabindex="0"
                data-l10n-id="pdfjs-findbar-button"
                aria-expanded="false"
                aria-controls="findbar"
                data-dom-id="viewFindButton"
                class="toolbarButton viewFindButton"
              >
                <span data-l10n-id="pdfjs-findbar-button-label"></span>
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
                      tabindex="0"
                      data-l10n-id="pdfjs-find-input"
                      aria-invalid="false"
                      data-dom-id="findInput"
                      class="toolbarField findInput"
                  /></span>
                  <div class="toolbarHorizontalGroup">
                    <button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-find-previous-button"
                      data-dom-id="findPreviousButton"
                      class="toolbarButton findPreviousButton"
                    >
                      <span
                        data-l10n-id="pdfjs-find-previous-button-label"
                      ></span>
                    </button>
                    <div class="splitToolbarButtonSeparator"></div>
                    <button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-find-next-button"
                      data-dom-id="findNextButton"
                      class="toolbarButton findNextButton"
                    >
                      <span data-l10n-id="pdfjs-find-next-button-label"></span>
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
                        class="findHighlightAll" /><span
                        class="toolbarLabel"
                        data-l10n-id="pdfjs-find-highlight-checkbox"
                      ></span></label
                    ><!--Removed!-->
                  </div>
                  <div class="toggleButton toolbarLabel">
                    <label
                      ><input
                        type="checkbox"
                        tabindex="0"
                        data-dom-id="findMatchCase"
                        class="findMatchCase" /><span
                        class="toolbarLabel"
                        data-l10n-id="pdfjs-find-match-case-checkbox-label"
                      ></span></label
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
                        class="findMatchDiacritics" /><span
                        class="toolbarLabel"
                        data-l10n-id="pdfjs-find-match-diacritics-checkbox-label"
                      ></span></label
                    ><!--Removed!-->
                  </div>
                  <div class="toggleButton toolbarLabel">
                    <label
                      ><input
                        type="checkbox"
                        tabindex="0"
                        data-dom-id="findEntireWord"
                        class="findEntireWord" /><span
                        class="toolbarLabel"
                        data-l10n-id="pdfjs-find-entire-word-checkbox-label"
                      ></span></label
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
                type="button"
                tabindex="0"
                data-l10n-id="pdfjs-previous-button"
                data-dom-id="previous"
                class="toolbarButton previous"
              >
                <span data-l10n-id="pdfjs-previous-button-label"></span>
              </button>
              <div class="splitToolbarButtonSeparator"></div>
              <button
                type="button"
                tabindex="0"
                data-l10n-id="pdfjs-next-button"
                data-dom-id="next"
                class="toolbarButton next"
              >
                <span data-l10n-id="pdfjs-next-button-label"></span>
              </button>
            </div>
            <div class="toolbarHorizontalGroup">
              <span class="loadingInput start toolbarHorizontalGroup"
                ><input
                  type="number"
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
                tabindex="0"
                data-l10n-id="pdfjs-zoom-out-button"
                data-dom-id="zoomOutButton"
                class="toolbarButton zoomOutButton"
              >
                <span data-l10n-id="pdfjs-zoom-out-button-label"></span>
              </button>
              <div class="splitToolbarButtonSeparator"></div>
              <button
                type="button"
                tabindex="0"
                data-l10n-id="pdfjs-zoom-in-button"
                data-dom-id="zoomInButton"
                class="toolbarButton zoomInButton"
              >
                <span data-l10n-id="pdfjs-zoom-in-button-label"></span>
              </button>
            </div>
            <span
              data-dom-id="scaleSelectContainer"
              class="dropdownToolbarButton scaleSelectContainer"
              ><select
                tabindex="0"
                data-l10n-id="pdfjs-zoom-select"
                data-dom-id="scaleSelect"
                class="scaleSelect"
              >
                <option
                  id="pageAutoOption"
                  value="auto"
                  selected="selected"
                  data-l10n-id="pdfjs-page-scale-auto"
                ></option>
                <option
                  id="pageActualOption"
                  value="page-actual"
                  data-l10n-id="pdfjs-page-scale-actual"
                ></option>
                <option
                  id="pageFitOption"
                  value="page-fit"
                  data-l10n-id="pdfjs-page-scale-fit"
                ></option>
                <option
                  id="pageWidthOption"
                  value="page-width"
                  data-l10n-id="pdfjs-page-scale-width"
                ></option>
                <option
                  id="customScaleOption"
                  value="custom"
                  disabled="disabled"
                  hidden="true"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 0 }'
                ></option>
                <option
                  value="0.5"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 50 }'
                ></option>
                <option
                  value="0.75"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 75 }'
                ></option>
                <option
                  value="1"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 100 }'
                ></option>
                <option
                  value="1.25"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 125 }'
                ></option>
                <option
                  value="1.5"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 150 }'
                ></option>
                <option
                  value="2"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 200 }'
                ></option>
                <option
                  value="3"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 300 }'
                ></option>
                <option
                  value="4"
                  data-l10n-id="pdfjs-page-scale-percent"
                  data-l10n-args='{ "scale": 400 }'
                ></option></select
            ></span>
          </div>
          <div
            data-dom-id="toolbarViewerRight"
            class="toolbarHorizontalGroup toolbarViewerRight"
          >
            <div
              data-dom-id="editorModeButtons"
              class="toolbarHorizontalGroup editorModeButtons"
            >
              <div
                hidden="true"
                data-dom-id="editorComment"
                class="toolbarButtonWithContainer editorComment"
              >
                <button
                  type="button"
                  tabindex="0"
                  disabled="disabled"
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="editorCommentParamsToolbar"
                  data-l10n-id="pdfjs-editor-comment-button"
                  data-dom-id="editorCommentButton"
                  class="toolbarButton editorCommentButton"
                >
                  <span data-l10n-id="pdfjs-editor-comment-button-label"></span>
                </button>
                <div
                  data-dom-id="editorCommentParamsToolbar"
                  class="editorParamsToolbar hidden menu editorCommentParamsToolbar"
                >
                  <div
                    role="landmark"
                    aria-labelledby="editorCommentsSidebarHeader"
                    data-dom-id="editorCommentsSidebar"
                    class="menuContainer comment sidebar editorCommentsSidebar"
                  >
                    <div
                      role="separator"
                      aria-controls="editorCommentsSidebar"
                      tabindex="0"
                      data-dom-id="editorCommentsSidebarResizer"
                      class="sidebarResizer editorCommentsSidebarResizer"
                    ></div>
                    <div
                      role="heading"
                      aria-level="2"
                      data-dom-id="editorCommentsSidebarHeader"
                      class="editorCommentsSidebarHeader"
                    >
                      <span class="commentCount"
                        ><span
                          data-l10n-id="pdfjs-editor-comments-sidebar-title"
                          data-l10n-args='{ "count": 0 }'
                          data-dom-id="editorCommentsSidebarTitle"
                          class="editorCommentsSidebarTitle"
                        ></span
                        ><span
                          data-dom-id="editorCommentsSidebarCount"
                          class="editorCommentsSidebarCount"
                        ></span></span
                      ><button
                        type="button"
                        tabindex="0"
                        data-l10n-id="pdfjs-editor-comments-sidebar-close-button"
                        data-dom-id="editorCommentsSidebarCloseButton"
                        class="editorCommentsSidebarCloseButton"
                      >
                        <span
                          data-l10n-id="pdfjs-editor-comments-sidebar-close-button-label"
                        ></span>
                      </button>
                    </div>
                    <div
                      tabindex="-1"
                      data-dom-id="editorCommentsSidebarListContainer"
                      class="editorCommentsSidebarListContainer"
                    >
                      <ul id="editorCommentsSidebarList"></ul>
                    </div>
                  </div>
                </div>
              </div>
              <div
                hidden="true"
                data-dom-id="editorSignature"
                class="toolbarButtonWithContainer editorSignature"
              >
                <button
                  type="button"
                  tabindex="0"
                  disabled="disabled"
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="editorSignatureParamsToolbar"
                  data-l10n-id="pdfjs-editor-signature-button"
                  data-dom-id="editorSignatureButton"
                  class="toolbarButton editorSignatureButton"
                >
                  <span
                    data-l10n-id="pdfjs-editor-signature-button-label"
                  ></span>
                </button>
                <div
                  data-dom-id="editorSignatureParamsToolbar"
                  class="editorParamsToolbar hidden doorHangerRight menu editorSignatureParamsToolbar"
                >
                  <div
                    role="region"
                    data-l10n-id="pdfjs-editor-add-signature-container"
                    data-dom-id="addSignatureDoorHanger"
                    class="menuContainer addSignatureDoorHanger"
                  >
                    <button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-editor-signature-add-signature-button"
                      data-dom-id="editorSignatureAddSignature"
                      class="toolbarButton labeled editorSignatureAddSignature"
                    >
                      <span
                        data-l10n-id="pdfjs-editor-signature-add-signature-button-label"
                        class="editorParamsLabel"
                      ></span>
                    </button>
                  </div>
                </div>
              </div>
              <div
                data-dom-id="editorHighlight"
                class="toolbarButtonWithContainer editorHighlight"
              >
                <button
                  type="button"
                  disabled="disabled"
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="editorHighlightParamsToolbar"
                  tabindex="0"
                  data-l10n-id="pdfjs-editor-highlight-button"
                  data-dom-id="editorHighlightButton"
                  class="toolbarButton editorHighlightButton"
                >
                  <span
                    data-l10n-id="pdfjs-editor-highlight-button-label"
                  ></span>
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
                      ></span>
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
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="editorFreeTextParamsToolbar"
                  tabindex="0"
                  data-l10n-id="pdfjs-editor-free-text-button"
                  data-dom-id="editorFreeTextButton"
                  class="toolbarButton editorFreeTextButton"
                >
                  <span
                    data-l10n-id="pdfjs-editor-free-text-button-label"
                  ></span>
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
                          class="editorParamsColor editorFreeTextColor" /><span
                          class="toolbarLabel"
                          data-l10n-id="pdfjs-editor-free-text-color-input"
                        ></span
                      ></label>
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
                          class="editorParamsSlider editorFreeTextFontSize" /><span
                          class="toolbarLabel"
                          data-l10n-id="pdfjs-editor-free-text-size-input"
                        ></span
                      ></label>
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
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="editorInkParamsToolbar"
                  tabindex="0"
                  data-l10n-id="pdfjs-editor-ink-button"
                  data-dom-id="editorInkButton"
                  class="toolbarButton editorInkButton"
                >
                  <span data-l10n-id="pdfjs-editor-ink-button-label"></span>
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
                          class="editorParamsColor editorInkColor" /><span
                          class="toolbarLabel"
                          data-l10n-id="pdfjs-editor-ink-color-input"
                        ></span
                      ></label>
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
                          class="editorParamsSlider editorInkThickness" /><span
                          class="toolbarLabel"
                          data-l10n-id="pdfjs-editor-ink-thickness-input"
                        ></span
                      ></label>
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
                          class="editorParamsSlider editorInkOpacity" /><span
                          class="toolbarLabel"
                          data-l10n-id="pdfjs-editor-ink-opacity-input"
                        ></span
                      ></label>
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
                  aria-expanded="false"
                  aria-haspopup="true"
                  aria-controls="editorStampParamsToolbar"
                  tabindex="0"
                  data-l10n-id="pdfjs-editor-stamp-button"
                  data-dom-id="editorStampButton"
                  class="toolbarButton editorStampButton"
                >
                  <span data-l10n-id="pdfjs-editor-stamp-button-label"></span>
                </button>
                <div
                  data-dom-id="editorStampParamsToolbar"
                  class="editorParamsToolbar hidden doorHangerRight menu editorStampParamsToolbar"
                >
                  <div class="menuContainer">
                    <button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-editor-stamp-add-image-button"
                      data-dom-id="editorStampAddImage"
                      class="toolbarButton labeled editorStampAddImage"
                    >
                      <span
                        class="editorParamsLabel"
                        data-l10n-id="pdfjs-editor-stamp-add-image-button-label"
                      ></span>
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
                tabindex="0"
                data-l10n-id="pdfjs-print-button"
                data-dom-id="printButton"
                class="toolbarButton printButton"
              >
                <span data-l10n-id="pdfjs-print-button-label"></span></button
              ><button
                type="button"
                tabindex="0"
                data-l10n-id="pdfjs-save-button"
                data-dom-id="downloadButton"
                class="toolbarButton downloadButton"
              >
                <span data-l10n-id="pdfjs-save-button-label"></span>
              </button>
            </div>
            <div class="verticalToolbarSeparator hiddenMediumView"></div>
            <div
              data-dom-id="secondaryToolbarToggle"
              class="toolbarButtonWithContainer secondaryToolbarToggle"
            >
              <button
                type="button"
                tabindex="0"
                data-l10n-id="pdfjs-tools-button"
                aria-expanded="false"
                aria-haspopup="true"
                aria-controls="secondaryToolbar"
                data-dom-id="secondaryToolbarToggleButton"
                class="toolbarButton secondaryToolbarToggleButton"
              >
                <span data-l10n-id="pdfjs-tools-button-label"></span>
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
                    tabindex="0"
                    data-l10n-id="pdfjs-open-file-button"
                    data-dom-id="secondaryOpenFile"
                    class="toolbarButton labeled secondaryOpenFile"
                  >
                    <span
                      data-l10n-id="pdfjs-open-file-button-label"
                    ></span></button
                  ><!--#endif-->
                  <div class="visibleMediumView">
                    <button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-print-button"
                      data-dom-id="secondaryPrint"
                      class="toolbarButton labeled secondaryPrint"
                    >
                      <span
                        data-l10n-id="pdfjs-print-button-label"
                      ></span></button
                    ><button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-save-button"
                      data-dom-id="secondaryDownload"
                      class="toolbarButton labeled secondaryDownload"
                    >
                      <span
                        data-l10n-id="pdfjs-save-button-label"
                      ></span></button
                    ><!--#if !GENERIC--><!--            <div class="horizontalToolbarSeparator"></div>--><!--#endif-->
                  </div>
                  <!--#if GENERIC-->
                  <div class="horizontalToolbarSeparator"></div>
                  <!--#endif--><button
                    type="button"
                    tabindex="0"
                    data-l10n-id="pdfjs-presentation-mode-button"
                    data-dom-id="presentationMode"
                    class="toolbarButton labeled presentationMode"
                  >
                    <span
                      data-l10n-id="pdfjs-presentation-mode-button-label"
                    ></span></button
                  ><a
                    href="#"
                    tabindex="0"
                    data-l10n-id="pdfjs-bookmark-button"
                    data-dom-id="viewBookmark"
                    class="toolbarButton labeled viewBookmark"
                    ><span data-l10n-id="pdfjs-bookmark-button-label"></span
                  ></a>
                  <div
                    data-dom-id="viewBookmarkSeparator"
                    class="horizontalToolbarSeparator viewBookmarkSeparator"
                  ></div>
                  <button
                    type="button"
                    tabindex="0"
                    data-l10n-id="pdfjs-first-page-button"
                    data-dom-id="firstPage"
                    class="toolbarButton labeled firstPage"
                  >
                    <span
                      data-l10n-id="pdfjs-first-page-button-label"
                    ></span></button
                  ><button
                    type="button"
                    tabindex="0"
                    data-l10n-id="pdfjs-last-page-button"
                    data-dom-id="lastPage"
                    class="toolbarButton labeled lastPage"
                  >
                    <span data-l10n-id="pdfjs-last-page-button-label"></span>
                  </button>
                  <div class="horizontalToolbarSeparator"></div>
                  <button
                    type="button"
                    tabindex="0"
                    data-l10n-id="pdfjs-page-rotate-cw-button"
                    data-dom-id="pageRotateCw"
                    class="toolbarButton labeled pageRotateCw"
                  >
                    <span
                      data-l10n-id="pdfjs-page-rotate-cw-button-label"
                    ></span></button
                  ><button
                    type="button"
                    tabindex="0"
                    data-l10n-id="pdfjs-page-rotate-ccw-button"
                    data-dom-id="pageRotateCcw"
                    class="toolbarButton labeled pageRotateCcw"
                  >
                    <span
                      data-l10n-id="pdfjs-page-rotate-ccw-button-label"
                    ></span>
                  </button>
                  <div class="horizontalToolbarSeparator"></div>
                  <div
                    role="radiogroup"
                    data-dom-id="cursorToolButtons"
                    class="cursorToolButtons"
                  >
                    <button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-cursor-text-select-tool-button"
                      role="radio"
                      aria-checked="true"
                      data-dom-id="cursorSelectTool"
                      class="toolbarButton labeled toggled cursorSelectTool"
                    >
                      <span
                        data-l10n-id="pdfjs-cursor-text-select-tool-button-label"
                      ></span></button
                    ><button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-cursor-hand-tool-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="cursorHandTool"
                      class="toolbarButton labeled cursorHandTool"
                    >
                      <span
                        data-l10n-id="pdfjs-cursor-hand-tool-button-label"
                      ></span>
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
                      tabindex="0"
                      data-l10n-id="pdfjs-scroll-page-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="scrollPage"
                      class="toolbarButton labeled scrollPage"
                    >
                      <span
                        data-l10n-id="pdfjs-scroll-page-button-label"
                      ></span></button
                    ><button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-scroll-vertical-button"
                      role="radio"
                      aria-checked="true"
                      data-dom-id="scrollVertical"
                      class="toolbarButton labeled toggled scrollVertical"
                    >
                      <span
                        data-l10n-id="pdfjs-scroll-vertical-button-label"
                      ></span></button
                    ><button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-scroll-horizontal-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="scrollHorizontal"
                      class="toolbarButton labeled scrollHorizontal"
                    >
                      <span
                        data-l10n-id="pdfjs-scroll-horizontal-button-label"
                      ></span></button
                    ><button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-scroll-wrapped-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="scrollWrapped"
                      class="toolbarButton labeled scrollWrapped"
                    >
                      <span
                        data-l10n-id="pdfjs-scroll-wrapped-button-label"
                      ></span>
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
                      tabindex="0"
                      data-l10n-id="pdfjs-spread-none-button"
                      role="radio"
                      aria-checked="true"
                      data-dom-id="spreadNone"
                      class="toolbarButton labeled toggled spreadNone"
                    >
                      <span
                        data-l10n-id="pdfjs-spread-none-button-label"
                      ></span></button
                    ><button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-spread-odd-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="spreadOdd"
                      class="toolbarButton labeled spreadOdd"
                    >
                      <span
                        data-l10n-id="pdfjs-spread-odd-button-label"
                      ></span></button
                    ><button
                      type="button"
                      tabindex="0"
                      data-l10n-id="pdfjs-spread-even-button"
                      role="radio"
                      aria-checked="false"
                      data-dom-id="spreadEven"
                      class="toolbarButton labeled spreadEven"
                    >
                      <span
                        data-l10n-id="pdfjs-spread-even-button-label"
                      ></span>
                    </button>
                  </div>
                  <div
                    data-dom-id="imageAltTextSettingsSeparator"
                    class="horizontalToolbarSeparator hidden imageAltTextSettingsSeparator"
                  ></div>
                  <button
                    type="button"
                    tabindex="0"
                    data-l10n-id="pdfjs-image-alt-text-settings-button"
                    aria-controls="altTextSettingsDialog"
                    data-dom-id="imageAltTextSettings"
                    class="toolbarButton labeled hidden imageAltTextSettings"
                  >
                    <span
                      data-l10n-id="pdfjs-image-alt-text-settings-button-label"
                    ></span>
                  </button>
                  <div class="horizontalToolbarSeparator"></div>
                  <button
                    type="button"
                    tabindex="0"
                    data-l10n-id="pdfjs-document-properties-button"
                    aria-controls="documentPropertiesDialog"
                    data-dom-id="documentProperties"
                    class="toolbarButton labeled documentProperties"
                  >
                    <span
                      data-l10n-id="pdfjs-document-properties-button-label"
                    ></span>
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
          <span data-l10n-id="pdfjs-password-cancel-button"></span></button
        ><button
          type="button"
          data-dom-id="passwordSubmit"
          class="dialogButton passwordSubmit"
        >
          <span data-l10n-id="pdfjs-password-ok-button"></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
        ></span>
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
          <span data-l10n-id="pdfjs-document-properties-close-button"></span>
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
          ></span
          ><span
            data-l10n-id="pdfjs-editor-alt-text-dialog-description"
            data-dom-id="dialogDescription"
            class="dialogDescription"
          ></span>
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
                  class="descriptionButton" /><span
                  class="toolbarLabel"
                  data-l10n-id="pdfjs-editor-alt-text-add-description-label"
                ></span></label
              ><!--Removed!-->
            </div>
            <div class="radioLabel">
              <span
                data-l10n-id="pdfjs-editor-alt-text-add-description-description"
                data-dom-id="descriptionAreaLabel"
                class="descriptionAreaLabel"
              ></span>
            </div>
          </div>
          <div class="descriptionArea">
            <textarea
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
                  class="decorativeButton" /><span
                  class="toolbarLabel"
                  data-l10n-id="pdfjs-editor-alt-text-mark-decorative-label"
                ></span></label
              ><!--Removed!-->
            </div>
            <div class="radioLabel">
              <span
                data-l10n-id="pdfjs-editor-alt-text-mark-decorative-description"
                data-dom-id="decorativeLabel"
                class="decorativeLabel"
              ></span>
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
            <span
              data-l10n-id="pdfjs-editor-alt-text-cancel-button"
            ></span></button
          ><button
            type="button"
            tabindex="0"
            data-dom-id="altTextSave"
            class="primaryButton altTextSave"
          >
            <span data-l10n-id="pdfjs-editor-alt-text-save-button"></span>
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
          ></span>
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
              ></span>
              <div
                role="note"
                data-dom-id="newAltTextDisclaimer"
                class="newAltTextDisclaimer"
              >
                <div>
                  <span
                    data-l10n-id="pdfjs-editor-new-alt-text-disclaimer1"
                  ></span
                  ><a
                    href="https://support.mozilla.org/en-US/kb/pdf-alt-text"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-l10n-id="pdfjs-editor-new-alt-text-disclaimer-learn-more-url"
                    tabindex="0"
                    data-dom-id="newAltTextLearnMore"
                    class="newAltTextLearnMore"
                  ></a>
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
              ></span>
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
              ></span
              ><span
                class="description"
                data-l10n-id="pdfjs-editor-new-alt-text-error-description"
              ></span>
            </div>
            <button
              type="button"
              tabindex="0"
              data-dom-id="newAltTextCloseButton"
              class="closeButton newAltTextCloseButton"
            >
              <span
                data-l10n-id="pdfjs-editor-new-alt-text-error-close-button"
              ></span>
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
            <span
              data-l10n-id="pdfjs-editor-alt-text-cancel-button"
            ></span></button
          ><button
            type="button"
            tabindex="0"
            data-dom-id="newAltTextNotNow"
            class="secondaryButton newAltTextNotNow"
          >
            <span
              data-l10n-id="pdfjs-editor-new-alt-text-not-now-button"
            ></span></button
          ><button
            type="button"
            tabindex="0"
            data-dom-id="newAltTextSave"
            class="primaryButton newAltTextSave"
          >
            <span data-l10n-id="pdfjs-editor-alt-text-save-button"></span>
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
          ></span>
        </div>
        <div data-dom-id="automaticAltText" class="automaticAltText">
          <span
            data-l10n-id="pdfjs-editor-alt-text-settings-automatic-title"
          ></span>
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
                ></span
                ><a
                  href="https://support.mozilla.org/en-US/kb/pdf-alt-text"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-l10n-id="pdfjs-editor-new-alt-text-disclaimer-learn-more-url"
                  tabindex="0"
                  data-dom-id="altTextSettingsLearnMore"
                  class="altTextSettingsLearnMore"
                ></a>
              </div>
            </div>
          </div>
        </div>
        <div class="dialogSeparator"></div>
        <div data-dom-id="altTextEditor" class="altTextEditor">
          <span
            data-l10n-id="pdfjs-editor-alt-text-settings-editor-title"
          ></span>
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
              ></span>
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
            <span
              data-l10n-id="pdfjs-editor-alt-text-settings-close-button"
            ></span>
          </button>
        </div>
      </div>
    </dialog>
    <dialog
      aria-labelledby="addSignatureDialogLabel"
      data-dom-id="addSignatureDialog"
      class="dialog signatureDialog addSignatureDialog"
    >
      <span
        data-l10n-id="pdfjs-editor-add-signature-dialog-label"
        data-dom-id="addSignatureDialogLabel"
        class="addSignatureDialogLabel"
      ></span>
      <div
        data-dom-id="addSignatureContainer"
        class="mainContainer addSignatureContainer"
      >
        <div class="title">
          <span
            role="sectionhead"
            data-l10n-id="pdfjs-editor-add-signature-dialog-title"
            tabindex="0"
          ></span>
        </div>
        <div
          role="tablist"
          data-dom-id="addSignatureOptions"
          class="addSignatureOptions"
        >
          <button
            type="button"
            role="tab"
            aria-selected="true"
            aria-controls="addSignatureTypeContainer"
            data-l10n-id="pdfjs-editor-add-signature-type-button"
            tabindex="0"
            data-dom-id="addSignatureTypeButton"
            class="addSignatureTypeButton"
          ></button
          ><button
            type="button"
            role="tab"
            aria-selected="false"
            aria-controls="addSignatureDrawContainer"
            data-l10n-id="pdfjs-editor-add-signature-draw-button"
            tabindex="0"
            data-dom-id="addSignatureDrawButton"
            class="addSignatureDrawButton"
          ></button
          ><button
            type="button"
            role="tab"
            aria-selected="false"
            aria-controls="addSignatureImageContainer"
            data-l10n-id="pdfjs-editor-add-signature-image-button"
            tabindex="-1"
            data-dom-id="addSignatureImageButton"
            class="addSignatureImageButton"
          ></button>
        </div>
        <div
          data-selected="type"
          data-dom-id="addSignatureActionContainer"
          class="addSignatureActionContainer"
        >
          <div
            role="tabpanel"
            aria-labelledby="addSignatureTypeButton"
            data-dom-id="addSignatureTypeContainer"
            class="addSignatureTypeContainer"
          >
            <input
              type="text"
              data-l10n-id="pdfjs-editor-add-signature-type-input"
              tabindex="0"
              data-dom-id="addSignatureTypeInput"
              class="addSignatureTypeInput"
            />
          </div>
          <div
            role="tabpanel"
            aria-labelledby="addSignatureDrawButton"
            tabindex="-1"
            data-dom-id="addSignatureDrawContainer"
            class="addSignatureDrawContainer"
          >
            <svg
              id="addSignatureDraw"
              xmlns="http://www.w3.org/2000/svg"
              aria-labelledby="addSignatureDrawPlaceholder"
            ></svg
            ><span
              data-l10n-id="pdfjs-editor-add-signature-draw-placeholder"
              data-dom-id="addSignatureDrawPlaceholder"
              class="addSignatureDrawPlaceholder"
            ></span>
            <div data-dom-id="thickness" class="thickness">
              <div>
                <!--Removed!--><label
                  ><input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value="1"
                    data-l10n-id="pdfjs-editor-add-signature-draw-thickness-range"
                    data-l10n-args='{ "thickness": 1 }'
                    tabindex="0"
                    data-dom-id="addSignatureDrawThickness"
                    class="addSignatureDrawThickness" /><span
                    class="toolbarLabel"
                    data-l10n-id="pdfjs-editor-add-signature-draw-thickness-range-label"
                  ></span
                ></label>
              </div>
            </div>
          </div>
          <div
            role="tabpanel"
            aria-labelledby="addSignatureImageButton"
            tabindex="-1"
            data-dom-id="addSignatureImageContainer"
            class="addSignatureImageContainer"
          >
            <svg
              id="addSignatureImage"
              xmlns="http://www.w3.org/2000/svg"
              aria-labelledby="addSignatureImagePlaceholder"
            ></svg>
            <div
              data-dom-id="addSignatureImagePlaceholder"
              class="addSignatureImagePlaceholder"
            >
              <span
                data-l10n-id="pdfjs-editor-add-signature-image-placeholder"
              ></span
              ><!--Removed!--><label id="addSignatureImageBrowse" tabindex="0"
                ><input
                  type="file"
                  data-dom-id="addSignatureFilePicker"
                  class="addSignatureFilePicker" /><span class="toolbarLabel">
                  <a
                    data-l10n-id="pdfjs-editor-add-signature-image-browse-link"
                  ></a> </span
              ></label>
            </div>
          </div>
          <div data-dom-id="addSignatureControls" class="addSignatureControls">
            <div data-dom-id="horizontalContainer" class="horizontalContainer">
              <div
                data-dom-id="addSignatureDescriptionContainer"
                class="addSignatureDescriptionContainer"
              >
                <!--Removed!--><span
                  data-dom-id="addSignatureDescription"
                  class="inputWithClearButton addSignatureDescription"
                  ><input
                    type="text"
                    data-l10n-id="pdfjs-editor-add-signature-description-input"
                    tabindex="0"
                    data-dom-id="addSignatureDescInput"
                    class="addSignatureDescInput" /><button
                    class="clearInputButton"
                    type="button"
                    tabindex="0"
                    aria-hidden="true"
                  ></button
                ></span>
              </div>
              <button
                type="button"
                data-l10n-id="pdfjs-editor-add-signature-clear-button"
                tabindex="0"
                data-dom-id="clearSignatureButton"
                class="clearSignatureButton"
              >
                <span
                  data-l10n-id="pdfjs-editor-add-signature-clear-button-label"
                ></span>
              </button>
            </div>
            <div
              data-dom-id="addSignatureSaveContainer"
              class="addSignatureSaveContainer"
            >
              <label
                ><input
                  type="checkbox"
                  data-dom-id="addSignatureSaveCheckbox"
                  class="addSignatureSaveCheckbox" /><span
                  class="toolbarLabel"
                  data-l10n-id="pdfjs-editor-add-signature-save-checkbox"
                ></span></label
              ><!--Removed!--><span
              ></span
              ><span
                data-l10n-id="pdfjs-editor-add-signature-save-warning-message"
                data-dom-id="addSignatureSaveWarning"
                class="addSignatureSaveWarning"
              ></span>
            </div>
          </div>
          <div
            hidden="true"
            data-dom-id="addSignatureError"
            class="messageBar addSignatureError"
          >
            <div>
              <div>
                <span
                  data-l10n-id="pdfjs-editor-add-signature-image-upload-error-title"
                  data-dom-id="addSignatureErrorTitle"
                  class="title addSignatureErrorTitle"
                ></span
                ><span
                  data-l10n-id="pdfjs-editor-add-signature-image-upload-error-description"
                  data-dom-id="addSignatureErrorDescription"
                  class="description addSignatureErrorDescription"
                ></span>
              </div>
              <button
                type="button"
                tabindex="0"
                data-dom-id="addSignatureErrorCloseButton"
                class="closeButton addSignatureErrorCloseButton"
              >
                <span
                  data-l10n-id="pdfjs-editor-add-signature-error-close-button"
                ></span>
              </button>
            </div>
          </div>
          <div class="dialogButtonsGroup">
            <button
              type="button"
              tabindex="0"
              data-dom-id="addSignatureCancelButton"
              class="secondaryButton addSignatureCancelButton"
            >
              <span
                data-l10n-id="pdfjs-editor-add-signature-cancel-button"
              ></span></button
            ><button
              type="button"
              disabled=""
              tabindex="0"
              data-dom-id="addSignatureAddButton"
              class="primaryButton addSignatureAddButton"
            >
              <span data-l10n-id="pdfjs-editor-add-signature-add-button"></span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
    <dialog
      aria-labelledby="editSignatureDescriptionTitle"
      data-dom-id="editSignatureDescriptionDialog"
      class="dialog signatureDialog editSignatureDescriptionDialog"
    >
      <div class="mainContainer">
        <div class="title">
          <span
            role="sectionhead"
            data-l10n-id="pdfjs-editor-edit-signature-dialog-title"
            tabindex="0"
            data-dom-id="editSignatureDescriptionTitle"
            class="editSignatureDescriptionTitle"
          ></span>
        </div>
        <div
          data-dom-id="editSignatureDescriptionAndView"
          class="editSignatureDescriptionAndView"
        >
          <div
            data-dom-id="editSignatureDescriptionContainer"
            class="editSignatureDescriptionContainer"
          >
            <!--Removed!--><span
              data-dom-id="editSignatureDescription"
              class="inputWithClearButton editSignatureDescription"
              ><input
                type="text"
                data-l10n-id="pdfjs-editor-add-signature-description-input"
                tabindex="0"
                data-dom-id="editSignatureDescInput"
                class="editSignatureDescInput" /><button
                class="clearInputButton"
                type="button"
                tabindex="0"
                aria-hidden="true"
              ></button
            ></span>
          </div>
          <svg id="editSignatureView" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>
        <div class="dialogButtonsGroup">
          <button
            type="button"
            tabindex="0"
            data-dom-id="editSignatureCancelButton"
            class="secondaryButton editSignatureCancelButton"
          >
            <span
              data-l10n-id="pdfjs-editor-add-signature-cancel-button"
            ></span></button
          ><button
            type="button"
            disabled=""
            tabindex="0"
            data-dom-id="editSignatureUpdateButton"
            class="primaryButton editSignatureUpdateButton"
          >
            <span
              data-l10n-id="pdfjs-editor-edit-signature-update-button"
            ></span>
          </button>
        </div>
      </div>
    </dialog>
    <dialog
      aria-labelledby="commentManagerTitle"
      data-dom-id="commentManagerDialog"
      class="dialog commentManager commentManagerDialog"
    >
      <div class="mainContainer">
        <div
          data-dom-id="commentManagerToolbar"
          class="title commentManagerToolbar"
        >
          <span
            role="sectionhead"
            data-l10n-id="pdfjs-editor-edit-comment-dialog-title-when-adding"
            data-dom-id="commentManagerTitle"
            class="commentManagerTitle"
          ></span>
        </div>
        <textarea
          data-l10n-id="pdfjs-editor-edit-comment-dialog-text-input"
          tabindex="0"
          data-dom-id="commentManagerTextInput"
          class="commentManagerTextInput"
        ></textarea>
        <div class="dialogButtonsGroup">
          <button
            type="button"
            tabindex="0"
            data-dom-id="commentManagerCancelButton"
            class="secondaryButton commentManagerCancelButton"
          >
            <span
              data-l10n-id="pdfjs-editor-edit-comment-dialog-cancel-button"
            ></span></button
          ><button
            type="button"
            disabled=""
            tabindex="0"
            data-dom-id="commentManagerSaveButton"
            class="primaryButton commentManagerSaveButton"
          >
            <span
              data-l10n-id="pdfjs-editor-edit-comment-dialog-save-button-when-adding"
            ></span>
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
        <span data-l10n-id="pdfjs-print-progress-message"></span>
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
          <span data-l10n-id="pdfjs-print-progress-close-button"></span>
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
        data-l10n-id="pdfjs-editor-undo-bar-undo-button"
        data-dom-id="editorUndoBarUndoButton"
        class="undoButton editorUndoBarUndoButton"
      >
        <span
          data-l10n-id="pdfjs-editor-undo-bar-undo-button-label"
        ></span></button
      ><button
        type="button"
        tabindex="0"
        data-l10n-id="pdfjs-editor-undo-bar-close-button"
        data-dom-id="editorUndoBarCloseButton"
        class="closeButton editorUndoBarCloseButton"
      >
        <span data-l10n-id="pdfjs-editor-undo-bar-close-button-label"></span>
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
function getViewerTemplate({ readerShell = true } = {}) {
  if (!templateFragment) {
    const el = document.createElement("template");
    el.innerHTML = template;
    templateFragment = el.content;
  }
  const fragment = document.importNode(templateFragment, true);
  return readerShell ? decorateReaderShell(fragment) : fragment;
}

export default getViewerTemplate;
