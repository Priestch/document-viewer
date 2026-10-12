/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// eslint-disable-next-line max-len
/** @typedef {import("../../pdf.js/src/display/api").OnProgressParameters} OnProgressParameters */
// eslint-disable-next-line max-len
/** @typedef {import("../../pdf.js/src/display/api").PDFDocumentLoadingTask} PDFDocumentLoadingTask */
/** @typedef {import("../../pdf.js/src/display/api").PDFDocumentProxy} PDFDocumentProxy */
/** @typedef {import("../../pdf.js/src/display/api").PDFPageProxy} PDFPageProxy */
/** @typedef {import("../../pdf.js/src/display/api").RenderTask} RenderTask */
/** @typedef {import("../../pdf.js/src/display/display_utils").PageViewport} PageViewport */
// eslint-disable-next-line max-len
/** @typedef {import("../../pdf.js/src/display/text_layer").TextLayerRenderTask} TextLayerRenderTask */

import {
  AbortException,
  AnnotationEditorParamsType,
  AnnotationEditorType,
  AnnotationMode,
  AnnotationType,
  createValidAbsoluteUrl,
  FeatureTest,
  getUuid,
  ImageKind,
  InvalidPDFException,
  makeArr,
  makeMap,
  makeObj,
  normalizeUnicode,
  OPS,
  PasswordResponses,
  PermissionFlag,
  ResponseException,
  shadow,
  updateUrlHash,
  Util,
  VerbosityLevel,
} from "../../pdf.js/src/shared/util.js";
import { MathClamp } from "../../pdf.js/src/shared/math_clamp.js";
import {
  build,
  getDocument,
  PDFDataRangeTransport,
  PDFWorker,
  version,
} from "../../pdf.js/src/display/api.js";
import { isValidExplicitDest } from "../../pdf.js/src/display/api_utils.js";
import {
  applyOpacity,
  CSSConstants,
  fetchData,
  findContrastColor,
  getFilenameFromUrl,
  getPdfFilenameFromUrl,
  getRGB,
  getRGBA,
  getXfaPageViewport,
  isDataScheme,
  isPdfFile,
  noContextMenu,
  OutputScale,
  PDFDateString,
  PixelsPerInch,
  renderRichText,
  RenderingCancelledException,
  setLayerDimensions,
  stopEvent,
  SupportedImageMimeTypes,
} from "../../pdf.js/src/display/display_utils.js";
import { DOMSVGFactory } from "../../pdf.js/src/display/svg_factory.js";
import { TouchManager } from "../../pdf.js/src/display/touch_manager.js";
import { TextLayer } from "../../pdf.js/src/display/text_layer.js";
import { TextLayerImages } from "../../pdf.js/src/display/text_layer_images.js";
import { AnnotationEditorLayer } from "../../pdf.js/src/display/editor/annotation_editor_layer.js";
import { AnnotationEditorUIManager } from "../../pdf.js/src/display/editor/tools.js";
import { SignatureExtractor } from "../../pdf.js/src/display/editor/drawers/signaturedraw.js";
import { AnnotationLayer } from "../../pdf.js/src/display/annotation_layer.js";
import { ColorPicker } from "../../pdf.js/src/display/editor/color_picker.js";
import { DrawLayer } from "../../pdf.js/src/display/draw_layer.js";
import { GlobalWorkerOptions } from "../../pdf.js/src/display/worker_options.js";
import { XfaLayer } from "../../pdf.js/src/display/xfa_layer.js";

/* eslint-disable-next-line no-unused-vars */
const pdfjsVersion = typeof PDFJSDev !== "undefined" ? PDFJSDev.eval("BUNDLE_VERSION") : void 0;
/* eslint-disable-next-line no-unused-vars */
const pdfjsBuild = typeof PDFJSDev !== "undefined" ? PDFJSDev.eval("BUNDLE_BUILD") : void 0;

export {
  AbortException,
  AnnotationEditorLayer,
  AnnotationEditorParamsType,
  AnnotationEditorType,
  AnnotationEditorUIManager,
  AnnotationLayer,
  AnnotationMode,
  AnnotationType,
  applyOpacity,
  build,
  ColorPicker,
  createValidAbsoluteUrl,
  CSSConstants,
  DOMSVGFactory,
  DrawLayer,
  FeatureTest,
  fetchData,
  findContrastColor,
  getDocument,
  getFilenameFromUrl,
  getPdfFilenameFromUrl,
  getRGB,
  getRGBA,
  getUuid,
  getXfaPageViewport,
  GlobalWorkerOptions,
  ImageKind,
  InvalidPDFException,
  isDataScheme,
  isPdfFile,
  isValidExplicitDest,
  makeArr,
  makeMap,
  makeObj,
  MathClamp,
  noContextMenu,
  normalizeUnicode,
  OPS,
  OutputScale,
  PasswordResponses,
  PDFDataRangeTransport,
  PDFDateString,
  PDFWorker,
  PermissionFlag,
  PixelsPerInch,
  renderRichText,
  RenderingCancelledException,
  ResponseException,
  setLayerDimensions,
  shadow,
  SignatureExtractor,
  stopEvent,
  SupportedImageMimeTypes,
  TextLayer,
  TextLayerImages,
  TouchManager,
  updateUrlHash,
  Util,
  VerbosityLevel,
  version,
  XfaLayer,
};
