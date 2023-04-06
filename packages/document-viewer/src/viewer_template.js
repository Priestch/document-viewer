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
            data-l10n-id="thumbs"
            role="radio"
            aria-checked="true"
            aria-controls="thumbnailView"
            data-dom-id="viewThumbnail"
            class="toolbarButton toggled viewThumbnail"
          >
            <span data-l10n-id="thumbs_label">Thumbnails</span></button
          ><button
            title="Show Document Outline (double-click to expand/collapse all items)"
            tabindex="3"
            data-l10n-id="document_outline"
            role="radio"
            aria-checked="false"
            aria-controls="outlineView"
            data-dom-id="viewOutline"
            class="toolbarButton viewOutline"
          >
            <span data-l10n-id="document_outline_label"
              >Document Outline</span
            ></button
          ><button
            title="Show Attachments"
            tabindex="4"
            data-l10n-id="attachments"
            role="radio"
            aria-checked="false"
            aria-controls="attachmentsView"
            data-dom-id="viewAttachments"
            class="toolbarButton viewAttachments"
          >
            <span data-l10n-id="attachments_label">Attachments</span></button
          ><button
            title="Show Layers (double-click to reset all layers to the default state)"
            tabindex="5"
            data-l10n-id="layers"
            role="radio"
            aria-checked="false"
            aria-controls="layersView"
            data-dom-id="viewLayers"
            class="toolbarButton viewLayers"
          >
            <span data-l10n-id="layers_label">Layers</span>
          </button>
        </div>
      </div>
      <div data-dom-id="toolbarSidebarRight" class="toolbarSidebarRight">
        <div
          data-dom-id="outlineOptionsContainer"
          class="hidden outlineOptionsContainer"
        >
          <div class="verticalToolbarSeparator"></div>
          <button
            disabled="disabled"
            title="Find Current Outline Item"
            tabindex="6"
            data-l10n-id="current_outline_item"
            data-dom-id="currentOutlineItem"
            class="toolbarButton currentOutlineItem"
          >
            <span data-l10n-id="current_outline_item_label"
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
        <input
          title="Find"
          placeholder="Find in document…"
          tabindex="91"
          data-l10n-id="find_input"
          aria-invalid="false"
          data-dom-id="findInput"
          class="toolbarField findInput"
        />
        <div class="splitToolbarButton">
          <button
            title="Find the previous occurrence of the phrase"
            tabindex="92"
            data-l10n-id="find_previous"
            data-dom-id="findPrevious"
            class="toolbarButton findPrevious"
          >
            <span data-l10n-id="find_previous_label">Previous</span>
          </button>
          <div class="splitToolbarButtonSeparator"></div>
          <button
            title="Find the next occurrence of the phrase"
            tabindex="93"
            data-l10n-id="find_next"
            data-dom-id="findNext"
            class="toolbarButton findNext"
          >
            <span data-l10n-id="find_next_label">Next</span>
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
          /><span class="toolbarLabel" data-l10n-id="find_highlight"
            >Highlight All</span
          ></label
        ><!--Removed!--><label
          ><input
            type="checkbox"
            tabindex="95"
            data-dom-id="findMatchCase"
            class="toolbarField findMatchCase"
          /><span class="toolbarLabel" data-l10n-id="find_match_case_label"
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
            data-l10n-id="find_match_diacritics_label"
            >Match Diacritics</span
          ></label
        ><!--Removed!--><label
          ><input
            type="checkbox"
            tabindex="97"
            data-dom-id="findEntireWord"
            class="toolbarField findEntireWord"
          /><span class="toolbarLabel" data-l10n-id="find_entire_word_label"
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
      data-dom-id="editorFreeTextParamsToolbar"
      class="editorParamsToolbar hidden doorHangerRight editorFreeTextParamsToolbar"
    >
      <div class="editorParamsToolbarContainer">
        <div class="editorParamsSetter">
          <!--Removed!--><label
            ><input
              type="color"
              tabindex="100"
              data-dom-id="editorFreeTextColor"
              class="editorParamsColor editorFreeTextColor"
            /><span class="toolbarLabel" data-l10n-id="editor_free_text_color"
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
              tabindex="101"
              data-dom-id="editorFreeTextFontSize"
              class="editorParamsSlider editorFreeTextFontSize"
            /><span class="toolbarLabel" data-l10n-id="editor_free_text_size"
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
              tabindex="102"
              data-dom-id="editorInkColor"
              class="editorParamsColor editorInkColor"
            /><span class="toolbarLabel" data-l10n-id="editor_ink_color"
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
              tabindex="103"
              data-dom-id="editorInkThickness"
              class="editorParamsSlider editorInkThickness"
            /><span class="toolbarLabel" data-l10n-id="editor_ink_thickness"
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
              tabindex="104"
              data-dom-id="editorInkOpacity"
              class="editorParamsSlider editorInkOpacity"
            /><span class="toolbarLabel" data-l10n-id="editor_ink_opacity"
              >Opacity</span
            ></label
          >
        </div>
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
          data-l10n-id="open_file"
          data-dom-id="secondaryOpenFile"
          class="secondaryToolbarButton visibleLargeView secondaryOpenFile"
        >
          <span data-l10n-id="open_file_label">Open</span></button
        ><!--#endif--><button
          title="Print"
          tabindex="52"
          data-l10n-id="print"
          data-dom-id="secondaryPrint"
          class="secondaryToolbarButton visibleMediumView secondaryPrint"
        >
          <span data-l10n-id="print_label">Print</span></button
        ><button
          title="Save"
          tabindex="53"
          data-l10n-id="save"
          data-dom-id="secondaryDownload"
          class="secondaryToolbarButton visibleMediumView secondaryDownload"
        >
          <span data-l10n-id="save_label">Save</span></button
        ><!--#if GENERIC-->
        <div class="horizontalToolbarSeparator visibleLargeView"></div>
        <!--#else--><!--        <div class="horizontalToolbarSeparator visibleMediumView"></div>--><!--#endif--><button
          title="Switch to Presentation Mode"
          tabindex="54"
          data-l10n-id="presentation_mode"
          data-dom-id="presentationMode"
          class="secondaryToolbarButton presentationMode"
        >
          <span data-l10n-id="presentation_mode_label"
            >Presentation Mode</span
          ></button
        ><a
          href="#"
          title="Current Page (View URL from Current Page)"
          tabindex="55"
          data-l10n-id="bookmark1"
          data-dom-id="viewBookmark"
          class="secondaryToolbarButton viewBookmark"
          ><span data-l10n-id="bookmark1_label">Current Page</span></a
        >
        <div
          data-dom-id="viewBookmarkSeparator"
          class="horizontalToolbarSeparator viewBookmarkSeparator"
        ></div>
        <button
          title="Go to First Page"
          tabindex="56"
          data-l10n-id="first_page"
          data-dom-id="firstPage"
          class="secondaryToolbarButton firstPage"
        >
          <span data-l10n-id="first_page_label">Go to First Page</span></button
        ><button
          title="Go to Last Page"
          tabindex="57"
          data-l10n-id="last_page"
          data-dom-id="lastPage"
          class="secondaryToolbarButton lastPage"
        >
          <span data-l10n-id="last_page_label">Go to Last Page</span>
        </button>
        <div class="horizontalToolbarSeparator"></div>
        <button
          title="Rotate Clockwise"
          tabindex="58"
          data-l10n-id="page_rotate_cw"
          data-dom-id="pageRotateCw"
          class="secondaryToolbarButton pageRotateCw"
        >
          <span data-l10n-id="page_rotate_cw_label"
            >Rotate Clockwise</span
          ></button
        ><button
          title="Rotate Counterclockwise"
          tabindex="59"
          data-l10n-id="page_rotate_ccw"
          data-dom-id="pageRotateCcw"
          class="secondaryToolbarButton pageRotateCcw"
        >
          <span data-l10n-id="page_rotate_ccw_label"
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
            data-l10n-id="cursor_text_select_tool"
            role="radio"
            aria-checked="true"
            data-dom-id="cursorSelectTool"
            class="secondaryToolbarButton toggled cursorSelectTool"
          >
            <span data-l10n-id="cursor_text_select_tool_label"
              >Text Selection Tool</span
            ></button
          ><button
            title="Enable Hand Tool"
            tabindex="61"
            data-l10n-id="cursor_hand_tool"
            role="radio"
            aria-checked="false"
            data-dom-id="cursorHandTool"
            class="secondaryToolbarButton cursorHandTool"
          >
            <span data-l10n-id="cursor_hand_tool_label">Hand Tool</span>
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
            data-l10n-id="scroll_page"
            role="radio"
            aria-checked="false"
            data-dom-id="scrollPage"
            class="secondaryToolbarButton scrollPage"
          >
            <span data-l10n-id="scroll_page_label">Page Scrolling</span></button
          ><button
            title="Use Vertical Scrolling"
            tabindex="63"
            data-l10n-id="scroll_vertical"
            role="radio"
            aria-checked="true"
            data-dom-id="scrollVertical"
            class="secondaryToolbarButton toggled scrollVertical"
          >
            <span data-l10n-id="scroll_vertical_label"
              >Vertical Scrolling</span
            ></button
          ><button
            title="Use Horizontal Scrolling"
            tabindex="64"
            data-l10n-id="scroll_horizontal"
            role="radio"
            aria-checked="false"
            data-dom-id="scrollHorizontal"
            class="secondaryToolbarButton scrollHorizontal"
          >
            <span data-l10n-id="scroll_horizontal_label"
              >Horizontal Scrolling</span
            ></button
          ><button
            title="Use Wrapped Scrolling"
            tabindex="65"
            data-l10n-id="scroll_wrapped"
            role="radio"
            aria-checked="false"
            data-dom-id="scrollWrapped"
            class="secondaryToolbarButton scrollWrapped"
          >
            <span data-l10n-id="scroll_wrapped_label">Wrapped Scrolling</span>
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
            data-l10n-id="spread_none"
            role="radio"
            aria-checked="true"
            data-dom-id="spreadNone"
            class="secondaryToolbarButton toggled spreadNone"
          >
            <span data-l10n-id="spread_none_label">No Spreads</span></button
          ><button
            title="Join page spreads starting with odd-numbered pages"
            tabindex="67"
            data-l10n-id="spread_odd"
            role="radio"
            aria-checked="false"
            data-dom-id="spreadOdd"
            class="secondaryToolbarButton spreadOdd"
          >
            <span data-l10n-id="spread_odd_label">Odd Spreads</span></button
          ><button
            title="Join page spreads starting with even-numbered pages"
            tabindex="68"
            data-l10n-id="spread_even"
            role="radio"
            aria-checked="false"
            data-dom-id="spreadEven"
            class="secondaryToolbarButton spreadEven"
          >
            <span data-l10n-id="spread_even_label">Even Spreads</span>
          </button>
        </div>
        <div class="horizontalToolbarSeparator"></div>
        <button
          title="Document Properties…"
          tabindex="69"
          data-l10n-id="document_properties"
          aria-controls="documentPropertiesDialog"
          data-dom-id="documentProperties"
          class="secondaryToolbarButton documentProperties"
        >
          <span data-l10n-id="document_properties_label"
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
              data-l10n-id="toggle_sidebar"
              aria-expanded="false"
              aria-controls="sidebarContainer"
              data-dom-id="sidebarToggle"
              class="toolbarButton sidebarToggle"
            >
              <span data-l10n-id="toggle_sidebar_label">Toggle Sidebar</span>
            </button>
            <div class="toolbarButtonSpacer"></div>
            <button
              title="Find in Document"
              tabindex="12"
              data-l10n-id="findbar"
              aria-expanded="false"
              aria-controls="findbar"
              data-dom-id="viewFind"
              class="toolbarButton viewFind"
            >
              <span data-l10n-id="findbar_label">Find</span>
            </button>
            <div class="splitToolbarButton hiddenSmallView">
              <button
                title="Previous Page"
                tabindex="13"
                data-l10n-id="previous"
                data-dom-id="previous"
                class="toolbarButton previous"
              >
                <span data-l10n-id="previous_label">Previous</span>
              </button>
              <div class="splitToolbarButtonSeparator"></div>
              <button
                title="Next Page"
                tabindex="14"
                data-l10n-id="next"
                data-dom-id="next"
                class="toolbarButton next"
              >
                <span data-l10n-id="next_label">Next</span>
              </button>
            </div>
            <input
              type="number"
              title="Page"
              value="1"
              min="1"
              tabindex="15"
              data-l10n-id="page"
              autocomplete="off"
              data-dom-id="pageNumber"
              class="toolbarField pageNumber"
            /><span data-dom-id="numPages" class="toolbarLabel numPages"></span>
          </div>
          <div data-dom-id="toolbarViewerRight" class="toolbarViewerRight">
            <!--#if GENERIC--><button
              title="Open File"
              tabindex="31"
              data-l10n-id="open_file"
              data-dom-id="openFile"
              class="toolbarButton hiddenLargeView openFile"
            >
              <span data-l10n-id="open_file_label">Open</span></button
            ><!--#endif--><button
              title="Print"
              tabindex="32"
              data-l10n-id="print"
              data-dom-id="print"
              class="toolbarButton hiddenMediumView print"
            >
              <span data-l10n-id="print_label">Print</span></button
            ><button
              title="Save"
              tabindex="33"
              data-l10n-id="save"
              data-dom-id="download"
              class="toolbarButton hiddenMediumView download"
            >
              <span data-l10n-id="save_label">Save</span>
            </button>
            <div class="verticalToolbarSeparator hiddenMediumView"></div>
            <div
              role="radiogroup"
              data-dom-id="editorModeButtons"
              class="splitToolbarButton toggled editorModeButtons"
            >
              <button
                disabled="disabled"
                title="Text"
                role="radio"
                aria-checked="false"
                tabindex="34"
                data-l10n-id="editor_free_text2"
                data-dom-id="editorFreeText"
                class="toolbarButton editorFreeText"
              >
                <span data-l10n-id="editor_free_text2_label">Text</span></button
              ><button
                disabled="disabled"
                title="Draw"
                role="radio"
                aria-checked="false"
                tabindex="35"
                data-l10n-id="editor_ink2"
                data-dom-id="editorInk"
                class="toolbarButton editorInk"
              >
                <span data-l10n-id="editor_ink2_label">Draw</span>
              </button>
            </div>
            <div
              data-dom-id="editorModeSeparator"
              class="verticalToolbarSeparator editorModeSeparator"
            ></div>
            <button
              title="Tools"
              tabindex="48"
              data-l10n-id="tools"
              aria-expanded="false"
              aria-controls="secondaryToolbar"
              data-dom-id="secondaryToolbarToggle"
              class="toolbarButton secondaryToolbarToggle"
            >
              <span data-l10n-id="tools_label">Tools</span>
            </button>
          </div>
          <div data-dom-id="toolbarViewerMiddle" class="toolbarViewerMiddle">
            <div class="splitToolbarButton">
              <button
                title="Zoom Out"
                tabindex="21"
                data-l10n-id="zoom_out"
                data-dom-id="zoomOut"
                class="toolbarButton zoomOut"
              >
                <span data-l10n-id="zoom_out_label">Zoom Out</span>
              </button>
              <div class="splitToolbarButtonSeparator"></div>
              <button
                title="Zoom In"
                tabindex="22"
                data-l10n-id="zoom_in"
                data-dom-id="zoomIn"
                class="toolbarButton zoomIn"
              >
                <span data-l10n-id="zoom_in_label">Zoom In</span>
              </button>
            </div>
            <span
              data-dom-id="scaleSelectContainer"
              class="dropdownToolbarButton scaleSelectContainer"
              ><select
                title="Zoom"
                tabindex="23"
                data-l10n-id="zoom"
                data-dom-id="scaleSelect"
                class="scaleSelect"
              >
                <option
                  id="pageAutoOption"
                  title=""
                  value="auto"
                  selected="selected"
                  data-l10n-id="page_scale_auto"
                >
                  Automatic Zoom
                </option>
                <option
                  id="pageActualOption"
                  title=""
                  value="page-actual"
                  data-l10n-id="page_scale_actual"
                >
                  Actual Size
                </option>
                <option
                  id="pageFitOption"
                  title=""
                  value="page-fit"
                  data-l10n-id="page_scale_fit"
                >
                  Page Fit
                </option>
                <option
                  id="pageWidthOption"
                  title=""
                  value="page-width"
                  data-l10n-id="page_scale_width"
                >
                  Page Width
                </option>
                <option
                  id="customScaleOption"
                  title=""
                  value="custom"
                  disabled="disabled"
                  hidden="true"
                ></option>
                <option
                  title=""
                  value="0.5"
                  data-l10n-id="page_scale_percent"
                  data-l10n-args='{ "scale": 50 }'
                >
                  50%
                </option>
                <option
                  title=""
                  value="0.75"
                  data-l10n-id="page_scale_percent"
                  data-l10n-args='{ "scale": 75 }'
                >
                  75%
                </option>
                <option
                  title=""
                  value="1"
                  data-l10n-id="page_scale_percent"
                  data-l10n-args='{ "scale": 100 }'
                >
                  100%
                </option>
                <option
                  title=""
                  value="1.25"
                  data-l10n-id="page_scale_percent"
                  data-l10n-args='{ "scale": 125 }'
                >
                  125%
                </option>
                <option
                  title=""
                  value="1.5"
                  data-l10n-id="page_scale_percent"
                  data-l10n-args='{ "scale": 150 }'
                >
                  150%
                </option>
                <option
                  title=""
                  value="2"
                  data-l10n-id="page_scale_percent"
                  data-l10n-args='{ "scale": 200 }'
                >
                  200%
                </option>
                <option
                  title=""
                  value="3"
                  data-l10n-id="page_scale_percent"
                  data-l10n-args='{ "scale": 300 }'
                >
                  300%
                </option>
                <option
                  title=""
                  value="4"
                  data-l10n-id="page_scale_percent"
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
          <span data-l10n-id="password_cancel">Cancel</span></button
        ><button
          data-dom-id="passwordSubmit"
          class="dialogButton passwordSubmit"
        >
          <span data-l10n-id="password_ok">OK</span>
        </button>
      </div>
    </dialog>
    <dialog
      data-dom-id="documentPropertiesDialog"
      class="documentPropertiesDialog"
    >
      <div class="row">
        <span
          data-l10n-id="document_properties_file_name"
          data-dom-id="fileNameLabel"
          class="fileNameLabel"
          >File name:</span
        >
        <p id="fileNameField" aria-labelledby="fileNameLabel">-</p>
      </div>
      <div class="row">
        <span
          data-l10n-id="document_properties_file_size"
          data-dom-id="fileSizeLabel"
          class="fileSizeLabel"
          >File size:</span
        >
        <p id="fileSizeField" aria-labelledby="fileSizeLabel">-</p>
      </div>
      <div class="separator"></div>
      <div class="row">
        <span
          data-l10n-id="document_properties_title"
          data-dom-id="titleLabel"
          class="titleLabel"
          >Title:</span
        >
        <p id="titleField" aria-labelledby="titleLabel">-</p>
      </div>
      <div class="row">
        <span
          data-l10n-id="document_properties_author"
          data-dom-id="authorLabel"
          class="authorLabel"
          >Author:</span
        >
        <p id="authorField" aria-labelledby="authorLabel">-</p>
      </div>
      <div class="row">
        <span
          data-l10n-id="document_properties_subject"
          data-dom-id="subjectLabel"
          class="subjectLabel"
          >Subject:</span
        >
        <p id="subjectField" aria-labelledby="subjectLabel">-</p>
      </div>
      <div class="row">
        <span
          data-l10n-id="document_properties_keywords"
          data-dom-id="keywordsLabel"
          class="keywordsLabel"
          >Keywords:</span
        >
        <p id="keywordsField" aria-labelledby="keywordsLabel">-</p>
      </div>
      <div class="row">
        <span
          data-l10n-id="document_properties_creation_date"
          data-dom-id="creationDateLabel"
          class="creationDateLabel"
          >Creation Date:</span
        >
        <p id="creationDateField" aria-labelledby="creationDateLabel">-</p>
      </div>
      <div class="row">
        <span
          data-l10n-id="document_properties_modification_date"
          data-dom-id="modificationDateLabel"
          class="modificationDateLabel"
          >Modification Date:</span
        >
        <p id="modificationDateField" aria-labelledby="modificationDateLabel">
          -
        </p>
      </div>
      <div class="row">
        <span
          data-l10n-id="document_properties_creator"
          data-dom-id="creatorLabel"
          class="creatorLabel"
          >Creator:</span
        >
        <p id="creatorField" aria-labelledby="creatorLabel">-</p>
      </div>
      <div class="separator"></div>
      <div class="row">
        <span
          data-l10n-id="document_properties_producer"
          data-dom-id="producerLabel"
          class="producerLabel"
          >PDF Producer:</span
        >
        <p id="producerField" aria-labelledby="producerLabel">-</p>
      </div>
      <div class="row">
        <span
          data-l10n-id="document_properties_version"
          data-dom-id="versionLabel"
          class="versionLabel"
          >PDF Version:</span
        >
        <p id="versionField" aria-labelledby="versionLabel">-</p>
      </div>
      <div class="row">
        <span
          data-l10n-id="document_properties_page_count"
          data-dom-id="pageCountLabel"
          class="pageCountLabel"
          >Page Count:</span
        >
        <p id="pageCountField" aria-labelledby="pageCountLabel">-</p>
      </div>
      <div class="row">
        <span
          data-l10n-id="document_properties_page_size"
          data-dom-id="pageSizeLabel"
          class="pageSizeLabel"
          >Page Size:</span
        >
        <p id="pageSizeField" aria-labelledby="pageSizeLabel">-</p>
      </div>
      <div class="separator"></div>
      <div class="row">
        <span
          data-l10n-id="document_properties_linearized"
          data-dom-id="linearizedLabel"
          class="linearizedLabel"
          >Fast Web View:</span
        >
        <p id="linearizedField" aria-labelledby="linearizedLabel">-</p>
      </div>
      <div class="buttonRow">
        <button
          data-dom-id="documentPropertiesClose"
          class="dialogButton documentPropertiesClose"
        >
          <span data-l10n-id="document_properties_close">Close</span>
        </button>
      </div>
    </dialog>
    <!--#if !MOZCENTRAL-->
    <dialog
      style="min-width: 200px"
      data-dom-id="printServiceDialog"
      class="printServiceDialog"
    >
      <div class="row">
        <span data-l10n-id="print_progress_message"
          >Preparing document for printing…</span
        >
      </div>
      <div class="row">
        <progress value="0" max="100"></progress
        ><span
          data-l10n-id="print_progress_percent"
          data-l10n-args='{ "progress": 0 }'
          class="relative-progress"
          >0%</span
        >
      </div>
      <div class="buttonRow">
        <button data-dom-id="printCancel" class="dialogButton printCancel">
          <span data-l10n-id="print_progress_close">Cancel</span>
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
