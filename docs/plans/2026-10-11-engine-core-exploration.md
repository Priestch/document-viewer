---
title: engine-core 开工前探索报告
description: Phase 0 第 3 步（engine-core 包骨架）的源码级探索结论：接口草案核对、双向契约验证、复用边界与实施清单
---

# engine-core 开工前探索报告

> 日期：2026-10-11。范围：Phase 0 第 3 步（engine-core 包骨架）开工前的探索，**不含任何主代码**。
> 方法：可行性报告（[2026-10-11-universal-viewer-feasibility.md](./2026-10-11-universal-viewer-feasibility.md)）的接口草案，向两侧源码核对——PDF 侧对 `packages/document-viewer/src/` 现有接线，EPUB 侧对 vendored foliate-js `78914aef`。关键结论均已抽查验证（bash grep + sed 复核）。
> 环境快照：pdf.js submodule 当时在 **v4.10.38**（第 1 步升级 master 进行中，由用户侧处理）。

## 0. 结论速览

接口草案（报告 §3.1）**基本成立**，但有 6 处需按实际源码修订（§1）。探索发现 4 个报告写作时未知/未验证的关键事实：

1. **可行性报告的复用清单以 master（24176a946）为基准；当前 vendored v4.10.38 上 RendererWorker / PagesMapper / `base_pdf_page_view.js` 全部不存在**（全 submodule 0 命中，已验证）。engine-core Phase 0 的可复用面收窄为：MessageHandler、fake-worker 回退模式、getDocument 本体、异常体系。master-only 能力留待第 1 步升级完成后重评。
2. **pdf.js 的 PDF header 校验在 worker 内且不抛错**：`core/document.js:1025-1031` `checkHeader()` 找不到 `%PDF-` 时注释明言 "don't throw an error and let parsing continue"；非 PDF 输入要等到 xref 阶段才抛 `InvalidPDFException("Invalid PDF structure")`（`core/xref.js:706`）。**⇒ `openDocument` 工厂必须在主线程先做 magic-byte 嗅探，不能依赖 getDocument 自己发现格式错误。**
3. **foliate-js 的 `makeBook`（view.js:79-123）自带一套 magic-byte 分派**（`PK\x03\x04` → CBZ/FBZ/EPUB、`%PDF-` → PDF PoC、MOBI、FB2），与我们的嗅探策略同构。engine-core 的嗅探常量应与它对齐，保证「工厂嗅探结果」与「foliate 内部分派」一致。
4. **foliate 的 `getVisibleRange`/`bisectNode` 是模块私有**（`paginator.js:94`、`paginator.js:63`，均为未导出 `const`，已验证）。可行性报告把这两个函数列为「直接搬的模块」——vendor 在手搬代码可行，但**不能 import**。EpubEngine 的「可视范围 → Location」应改从 `relocate` 事件的 `detail.range` 取（paginator 内部已算好，`paginator.js:969`）。

## 1. DocumentEngine 接口草案 v0.2（核对后修订）

以报告 §3.1 为底，逐条修订：

| #   | 报告草案                                                           | 修订为                                                                                                                                                                                                                                          | 依据                                                                                                                                                            |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `resolveHref` → `{ index, anchor(doc): Range \| Element \| null }` | `anchor(doc): Range \| Element \| number \| null`；目标不存在时**整体返回 `null` 而非 throw**                                                                                                                                                   | foliate `epub.js:1048-1055`：无 hash 时 anchor 是常函数 `() => 0`（0 = fraction）；`resolveCFI` 的 anchor 返回 Range（`epubcfi.js:296`）；找不到 item 返回 null |
| 2   | `getSection(index): { load(): Promise<string> }`                   | `load()` 语义明确为 **blob URL 字符串**（iframe.src 载体）；补充 `createDocument(): Promise<Document>`（搜索/文本抽取用，DOMParser 解析不进 DOM）；`linear`、`size` 可选字段                                                                    | foliate `epub.js:979-999` sections 构造                                                                                                                         |
| 3   | 无错误通道                                                         | 新增 `onError` / 事件订阅语义：foliate **没有任何 error 事件**，section 加载失败被 `console.warn` 吞（`paginator.js:1015-1019`），需 EpubEngine 自己包 try/catch + 监听 `book.transformTarget` 的 `data` 事件（reader.js:114 的现成姿势）补桥接 | foliate 全源码无 error CustomEvent                                                                                                                              |
| 4   | 方法全量必选                                                       | 契约方法按 **optional** 声明，消费方用能力探测                                                                                                                                                                                                  | foliate 自身对 book 方法全用 `?.`（view.js:359 等）；未来 CBZ/MOBI 引擎能力面更窄                                                                               |
| 5   | `capabilities: CapabilityFlags`                                    | 明确 `delivery: "canvas" \| "dom"` 维度（工程红线 5）；初版字段：`reflow`、`textStyle`、`annotationEditing`、`outline`、`tts`、`delivery`                                                                                                       | 报告 §3.1 要点 + 红线 5                                                                                                                                         |
| 6   | `sectionIndex \| page`                                             | section **没有 `index` 字段**，index 是数组下标（`epub.js:1052` 用 `findIndex`）——Location 的 `sectionIndex` 语义 = spine 数组下标，接口文档写明                                                                                                | foliate `epub.js:979-999`                                                                                                                                       |

**Location schema v1 草稿**（一出生带版本号，红线 4）：

```typescript
interface Location {
  version: 1;
  page?: number; // PDF 强字段（1-based）
  sectionIndex?: number; // EPUB 强字段（spine 数组下标）
  cfi?: string; // EPUB 强字段（epubcfi.js 语法）
  textAnchor?: {
    // 抗重排兜底（表示法 Phase 0 只定字段，实现可后补）
    text: string; //   锚点文本片段
    offset: number; //   片段内偏移
  };
  percentage: number; // 永远可用（0-1）
  docId?: string; // 文档指纹（PDF: fingerprints；EPUB: 书 identifier）
}
```

现状佐证「统一 Location 不存在」：viewer 侧进度只有 page/zoom/scrollLeft/scrollTop（`default_app.js:1193-1205` ViewHistory）和 hash 字符串，无 cfi/percentage/textAnchor 任何概念。

**Overlayer API 修正**（对报告 §3.1 要点「标注」）：foliate overlayer 实例 API 是 `add(key, range, drawFn, options)` / `remove(key)` / `redraw()` / `hitTest({x,y})`（`overlayer.js:17-41`），highlight/underline 等是**静态绘制函数**（`Overlayer.highlight` 等，overlayer.js:126）。统一标注层的引擎自解释钩子按此形状设计。

## 2. PDF 侧切面图：现有接线 → DocumentEngine 映射

| DocumentEngine 方法 | 现有对应（file:line）                                                                                                                                                                                                                     | 备注                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`              | `ViewerApplication.open(args)`（`default_app.js:967-1032`）：`GlobalWorkerOptions` 合并（:975）→ `getDocument({...apiParams, ...args})`（:991，经 `pdfjs-lib` alias → `src/pdf_js/index.js:47`）；onPassword/onProgress 钩子（:996-1009） | 数据源已支持 url/TypedArray/ArrayBuffer；workerSrc 在 `app_manager.js:197` 硬编码 `${resourcePath}/build/pdf.worker.mjs`（已验证）——改为 engine 构造参数 |
| `getMetadata`       | `pdfDocument.getMetadata()`（`default_app.js:1454`，缓存于 `documentInfo` :1370）                                                                                                                                                         | 直接可包                                                                                                                                                 |
| `getOutline`        | `pdfDocument.getOutline()`（`default_app.js:1335`）                                                                                                                                                                                       | 直接可包                                                                                                                                                 |
| `goTo`              | `pdfViewer.currentPageNumber` setter（`default_app.js:787`）+ `pdfLinkService`（命名目的地，:484）+ PDFHistory                                                                                                                            | 多字段 Location 中只吃 `page`，其余忽略                                                                                                                  |
| `getPosition`       | **不存在**（只有 ViewHistory 的 page/scroll 与 hash）                                                                                                                                                                                     | 新建：page + percentage（page/numPages）+ docId(fingerprints)                                                                                            |
| `getTextContent`    | `PDFPageProxy.getTextContent`（pdf.js api.js，src/ 无直接调用，find 走 `PDFFindController`）                                                                                                                                              | 逐页聚合成 AsyncIterableIterator                                                                                                                         |
| `destroy`           | `close()`：`pdfViewer.setDocument(null)` + `pdfLoadingTask.destroy()`（`default_app.js:929`）                                                                                                                                             | 直接可包                                                                                                                                                 |

**PdfEngine 适配层落点建议**：`packages/document-viewer` 包内（PDF 接线所有权在此；engine-core 保持**零 submodule 依赖**）。依赖方向用注册表倒置：引擎侧调 `registerEngine({ sniff, create })`，`openDocument` 工厂查表分派——engine-core 不 import 任何格式引擎，红线 3 的「引擎 first-class」与包边界同时满足。

**扩展姿势范例**（红线 1 合规）：`src/pdf_js/index.js` 桶模块 + `pdfjs-lib` alias 是自有代码消费 pdf.js 源码树的正确姿势；`plugin_manager.js:1-6` 的 import 包装是 monkey-patch 范例。PdfEngine 照前者。

## 3. foliate-js 契约核对结果（vendored 78914aef）

**存在的明文契约**（全部核实）：

- `makeBook(file|string)` + 错误类 `ResponseError/NotFoundError/UnsupportedTypeError`（view.js:68-79）；字符串走 `fetch` → `File` → 魔数分派（view.js:72-123）
- `<foliate-view>`：`View.open(book)`、`goTo/prev/next`、`search`、`addAnnotation`、`getCFI(index, range)`（view.js:431）、`resolveCFI`；`View.open` 按 `rendition?.layout === 'pre-paginated'` 分派 `foliate-fxl`/`foliate-paginator`（view.js:233-296）
- book：`sections[]`（load→blob URL / unload / createDocument / size / linear / cfi / resolveHref(section 内相对链接)）、`resolveHref`→`{index,anchor}`、`resolveCFI`、`isExternal`（epub.js:1063）、`getTOCFragment`、`transformTarget`
- `epubcfi.js` 全 named 导出：`isCFI/parse/fromRange/toRange(doc, parts)/toElement/compare/...`（**无 `toDOMRange`**，先 `parse()` 再 `toRange(doc, parts)`）
- `search.js`：`search(strs, query, opts)`、`searchMatcher(textWalker, opts)`（**需调用方传入 textWalker**，view.js:548 用法）；`text-walker.js`：`textWalker`
- `Overlayer`（API 形状见 §1 修订 6 行）
- 事件：view 层 `relocate {fraction, location, tocItem, pageItem, cfi, range, ...}`（view.js:337）、`load {doc, index}`、`link`/`external-link`（cancelable）、`create-overlay`、`draw-annotation`、`show-annotation`；paginator 层 `relocate {reason, range, index, fraction, size}`（paginator.js:969）、`load`、`create-overlayer`、`scroll`

**四个缺口**（§0 结论 4 + 以下）：

- **A 私有工具**：`getVisibleRange`/`bisectNode` 未导出——不 import；可视范围定位改吃 `relocate` 事件的 `detail.range`
- **B 错误通道**：无 error 事件，失败静默——EpubEngine 自建桥接（§1 修订 3）
- **C 隐式契约**：section 无 index 字段、anchor 返回类型联合、book 方法大量 optional（view.js 全 `?.`）
- **D Overlayer 形状**：`add(key, range, drawFn, options)` + 静态绘制函数，非 `highlight()` 方法

**结论**：EpubEngine 只依赖上述契约**够用**，缺口全部可在引擎适配层内消化，不需要 fork foliate。

## 4. pdf.js v4.10.38 复用边界（当前版本事实）

**可复用（Phase 0 就位）**：

- `MessageHandler`（`src/shared/message_handler.js:80`）：格式无关 RPC/流式/异常重建；唯一 PDF 痕迹是 `wrapReason` 的异常类白名单（:45-78），EPUB worker 复用时未知异常会被包成 `UnknownErrorException`——可接受或扩展白名单
- fake-worker 回退模式：worker 建连 `test` 消息（transfer Uint8Array 验证 structured clone）→ 失败回退主线程 LoopbackPort + 动态 import worker 入口（api.js:2184-2393）。**`LoopbackPort` 未导出**——engine-core 需复制该模式（~50 行）而非 import
- `getDocument` 全流程 = PdfEngine.open 本体（参数透传面：url/data/range/httpHeaders/withCredentials/密码/cMapUrl/standardFontDataUrl 等清单见 api.js:254-340）
- 异常体系 `InvalidPDFException/MissingPDFException/PasswordException/AbortException`（shared/util.js）作为统一 engine 错误分类
- worker 握手协议（test → ready → GetDocRequest → docId-scoped handler，worker.js:83-100 + api.js:2212-2277）作为未来 EPUB worker 的协议模板
- `RenderTask` 形状（api.js:3254）：cancellable promise + `onContinue` 协作式反压——EPUB render 合约照此形状（iframe 加载 + `doc.fonts.ready` + 布局完成 resolve，可 cancel）

**不存在（master-only，升级后重评）**：`RendererWorker`、`PagesMapper`、`base_pdf_page_view.js`——全 submodule 0 命中（已验证）。**设计约束：engine-core 与 EpubEngine 的 Phase 0 代码不得依赖这三者；第 1 步升级到 24176a946 后按可行性报告 §1.1 重评 worker 渲染与页视图抽象。**

## 5. 包骨架与仓库惯例

```
packages/engine-core/
├── package.json          # @document-kits/engine-core；ISC；repository+directory；
│                         #   publishConfig（非 private）；exports "." → src（见开放问题 1）
├── src/
│   ├── index.js          # 公共出口
│   ├── engine.js         # DocumentEngine 接口（JSDoc）+ 能力探测约定
│   ├── capabilities.js   # CapabilityFlags（含 delivery 维度）
│   ├── location.js       # Location schema v1 + 版本常量
│   ├── sniff.js          # magic-byte 嗅探（对齐 foliate makeBook 常量）
│   └── factory.js        # openDocument + registerEngine 注册表
└── (无 tsconfig / 无独立 eslint 配置——根 flat config 自动覆盖；无测试框架——验证走 demos)
```

惯例事实：pnpm-workspace glob `packages/*` 自动纳入（pnpm-workspace.yaml:1-5）；纯 ESM JS、无 TS、import 带 `.js` 后缀；prettier printWidth 99 + pre-commit hooks；demos 以 `workspace:*` 消费子包（demos/package.json:11）；根 scripts 用 `pnpm --filter` 转发。

## 6. 开放问题（实施前拍板）

1. **engine-core 发布形态**：源码 ESM 直发（`"type": "module"` + exports→src，零构建）vs 照 viewer 出 dist。**建议前者**（接口包无构建需求，demos 走 workspace；与 sibling 不一致但更简）。
2. **嗅探命中策略**：`PK` 头命中但 mimetype entry 非 `application/epub+zip` 时怎么办——同壳还有 CBZ/FB2（foliate 附带 parser）。Phase 0 建议只认 `%PDF-` 与 EPUB（PK + mimetype），CBZ/FB2 留接口位不注册。
3. **textAnchor 实现时点**：Phase 0 只定字段与语义（§1 草稿），抽取/重锚定算法后补——避免第 3 步范围膨胀。
4. **PdfEngine 文件位置**：`packages/document-viewer/src/pdf_engine.js`（推荐）还是独立目录；命名随实施定。
5. **升级后重评时点**：第 1 步落到 24176a946 后，按 §4 重评 master-only 复用面（影响 Phase 1+，不阻塞 Phase 0）。

## 7. 实施清单（下一阶段执行，本报告仅为依据）

1. scaffold `packages/engine-core`（§5 文件树，含 package.json 惯例）
2. `location.js`：Location v1 + 版本常量 + 校验
3. `capabilities.js`：CapabilityFlags（delivery 维度）
4. `sniff.js`：支持 string-url / File / ArrayBuffer / TypedArray / Response 前缀读取；`%PDF-`（容忍前导垃圾偏移搜索，与 pdf.js `find` 一致）/ `PK\x03\x04` + mimetype entry
5. `factory.js`：`openDocument(source, opts)` + `registerEngine`
6. `packages/document-viewer` 内 `PdfEngine implements DocumentEngine`（包 `default_app.js:967` open 面；壳层零改动——先证明接口够表达 PDF）
7. 验收：demos 冒烟，PdfEngine 以 DocumentEngine 形状走通 open → getMetadata → getOutline → goTo(page) → getPosition → destroy

（第 4 步 EPUB 最小通路不在本清单内，另起。）
