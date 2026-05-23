import {
  AnnotationLayer,
  StampAnnotationElement,
} from "../pdf.js/src/display/annotation_layer.js";
import { DOMSVGFactory } from "../pdf.js/src/display/display_utils.js";
import { AnnotationLayerBuilder } from "../pdf.js/web/annotation_layer_builder.js";

const AnnotationElement = Object.getPrototypeOf(StampAnnotationElement);
const _svgFactory = new DOMSVGFactory();
const _customTypes = new Map();

/**
 * Register a custom annotation element class.
 * @param {string|number} typeName
 * @param {typeof AnnotationElement} ElementClass
 */
function registerAnnotationType(typeName, ElementClass) {
  _customTypes.set(typeName, ElementClass);
}

const _originalLayerRender = AnnotationLayer.prototype.render;
AnnotationLayer.prototype.render = async function (params) {
  const builtIn = [];
  const custom = [];

  for (const data of params.annotations) {
    if (_customTypes.has(data.annotationType)) {
      custom.push(data);
    } else {
      builtIn.push(data);
    }
  }

  await _originalLayerRender.call(this, { ...params, annotations: builtIn });

  for (const data of custom) {
    const ElementClass = _customTypes.get(data.annotationType);
    if (!ElementClass) continue;

    const element = new ElementClass({
      data,
      layer: this.div,
      linkService: params.linkService,
      downloadManager: params.downloadManager,
      imageResourcesPath: params.imageResourcesPath || "",
      renderForms: params.renderForms !== false,
      svgFactory: _svgFactory,
      annotationStorage: params.annotationStorage,
      enableScripting: params.enableScripting,
      hasJSActions: params.hasJSActions,
      fieldObjects: params.fieldObjects,
      parent: this,
      elements: null,
    });

    if (element.isRenderable) {
      const rendered = element.render();
      if (data.hidden) rendered.style.visibility = "hidden";
      this.div.append(rendered);
    }
  }
};

let _activePluginManager = null;

const _originalBuilderRender = AnnotationLayerBuilder.prototype.render;
AnnotationLayerBuilder.prototype.render = async function (viewport, intent) {
  if (!_activePluginManager) {
    return _originalBuilderRender.call(this, viewport, intent);
  }

  const originalGetAnnotations = this.pdfPage.getAnnotations.bind(this.pdfPage);
  const pluginManager = _activePluginManager;
  const pageIndex = this.pdfPage._pageIndex;

  this.pdfPage.getAnnotations = async function (opts) {
    const [builtin, plugin] = await Promise.all([
      originalGetAnnotations(opts),
      pluginManager.getAnnotationsForPage(pageIndex, this),
    ]);
    return builtin.concat(plugin);
  };

  try {
    return await _originalBuilderRender.call(this, viewport, intent);
  } finally {
    this.pdfPage.getAnnotations = originalGetAnnotations;
  }
};

function setActivePluginManager(manager) {
  _activePluginManager = manager;
}

/**
 * Plugin manager for @document-kits/viewer.
 *
 * Plugin interface:
 * {
 *   name: string,
 *   annotationTypes?: { [typeName]: AnnotationElementClass },
 *   getAnnotations?(pageIndex, pdfPage): Promise<AnnotationData[]>,
 *   onInit?(app): void | Promise<void>,
 *   onDocumentLoad?(app): void | Promise<void>,
 *   onDestroy?(app): void,
 * }
 */
class PluginManager {
  #plugins = [];

  constructor(plugins = []) {
    for (const plugin of plugins) {
      this.register(plugin);
    }
  }

  register(plugin) {
    if (!plugin.name) {
      throw new Error("Plugin must have a name");
    }
    if (plugin.annotationTypes) {
      for (const [name, Class] of Object.entries(plugin.annotationTypes)) {
        registerAnnotationType(name, Class);
      }
    }
    this.#plugins.push(plugin);
  }

  async getAnnotationsForPage(pageIndex, pdfPage) {
    const results = await Promise.allSettled(
      this.#plugins
        .filter((p) => p.getAnnotations)
        .map((p) => p.getAnnotations(pageIndex, pdfPage))
    );
    const all = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value) {
        all.push(...r.value);
      } else if (r.status === "rejected") {
        const plugin = this.#plugins.filter((p) => p.getAnnotations)[i];
        console.error(`Plugin "${plugin.name}" getAnnotations error:`, r.reason);
      }
    }
    return all;
  }

  async #invokeHook(hookName, app) {
    const applicable = this.#plugins.filter((p) => p[hookName]);
    const results = await Promise.allSettled(
      applicable.map((p) => Promise.resolve(p[hookName](app)))
    );
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "rejected") {
        console.error(`Plugin "${applicable[i].name}" ${hookName} error:`, results[i].reason);
      }
    }
  }

  initPlugins(app) {
    return this.#invokeHook("onInit", app);
  }

  notifyDocumentLoad(app) {
    return this.#invokeHook("onDocumentLoad", app);
  }

  notifyDestroy(app) {
    return this.#invokeHook("onDestroy", app);
  }
}

export { PluginManager, AnnotationElement, registerAnnotationType, setActivePluginManager };
