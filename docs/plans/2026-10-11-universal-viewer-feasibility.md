# Universal Viewer 可行性评估：以 pdf.js worker 架构为底座（PDF + EPUB）

**日期**：2026-10-11
**分析对象**：本仓库（mozilla/pdf.js 上游 master 纯净 clone，HEAD = origin/master 24176a946）、epub.js 0.3.93、foliate-js（2026-05）、koodo-reader、epubreader-js、zotero/epub.js
**前置调研**：2026-06 的行业调研（Okular / SumatraPDF / MuPDF / KOReader / foliate-js 对比，结论为「双渲染器 + 引擎接口抽象」可行）

---

## 0. 结论（先说答案）

**可行，且条件比 6 月调研时更好。** 但有一条必须坚守的架构红线：

> **统一发生在「文档模型 / 接口层」，不发生在渲染层。**
> PDF 走 pdf.js 原生管线（parse worker → operator list → canvas/renderer worker），
> EPUB 走 iframe + CSS columns（浏览器排版引擎）。
> 任何试图把 EPUB 塞进 op-list/canvas、或把 PDF 塞进 iframe 的方案都被实践证伪过
> （foliate-js 的 PDF 适配只是 PoC 且搜索/标注残缺；koodit 把 PDF 页塞进 chapter 模型导致
> 66 处 `format === "PDF"` 泄漏到 UI）。

支持「以 pdf.js 为底座」的三个新证据：

1. **上游 pdf.js 本身已是双 worker 架构**（解析 worker + OffscreenCanvas 渲染 worker，多 MessageHandler targetName 并存已被验证），且由 mozilla 官方维护——加第三个 worker（或主线程引擎）在架构上无新风险，还免去了自行维护分叉的成本。
2. **Zotero 7 是已上线的同构产品**：pdf.js（PDF）+ headless epub.js（只取解析/CFI）+ 自研视图层，统一标注体系。
3. **foliate-js（MIT、零依赖、活跃维护）** 提供了 EPUB 侧最完整的开源资产：parser、paginator、overlayer、epubcfi、search，且其「book 接口」天然切在 worker 化需要的缝上（`sections[].load()` 返回 URL）。

---

## 1. pdf.js 底座：复用 / 抽象 / 保留清单

### 1.1 可直接复用（格式无关）

| 资产                                             | 位置                                                                                                                           | 说明                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| MessageHandler（RPC/流式/异常重建/Transferable） | `src/shared/message_handler.js`                                                                                                | 整个方案的地基，100% 格式无关；comObj 只需 postMessage + addEventListener |
| LoopbackPort / fake worker 模式                  | `src/display/api_utils.js:150`、`api.js:2330-2353`                                                                             | 引擎可 worker 可主线程双模式运行，新引擎照抄                              |
| worker 生命周期骨架                              | `src/core/worker.js`（WorkerTask、initializeFromPort 握手、Terminate/Cleanup 协议）                                            |                                                                           |
| 数据供给流协议                                   | `GetReader/GetRangeReader`（`api.js:2596-2705`，`BasePDFStream`）                                                              | worker 内按需拉源数据 + chunk transfer，EPUB zip 分块读取可直接套用       |
| 资源旁路通道模式                                 | `commonobj/obj` → `ObjectHandler` → `PDFObjects` promise-map                                                                   | worker 往主线程送字体/图片等共享资源的现成模式                            |
| RendererWorker 整套模式                          | `display/renderer_worker*.js`                                                                                                  | worker 渲染 + ImageBitmap 帧回传 + 渐进上屏 + 主线程 fallback             |
| PagesMapper（逻辑页号 ≠ 物理索引）               | `display/pages_mapper.js`                                                                                                      | 「页」概念的松动先例，EPUB 分页/重排可参考                                |
| 构建样板                                         | `gulpfile.mjs:671` `createRendererWorkerBundle`                                                                                | 新增 worker 入口只需照抄登记 5 处                                         |
| 代理层格式无关方法                               | `PDFDocumentProxy`: getMetadata/getOutline/getPage/getTextContent；`render()` 合约（canvas+viewport+RenderTask+cancel+渐进帧） |                                                                           |

### 1.2 需要抽象/重构

- `getDocument()` → 泛化为 `openDocument({type, ...})` 工厂：按内容嗅探/扩展名分派引擎，选 workerSrc。
- `core/worker.js` 的 `createDocumentHandler`（30 个 handler 挤在一个闭包）拆成「传输/生命周期层（通用）+ 文档语义层（每格式一个实现）」，定义格式 worker 接口 `{name, setup, createDocumentHandler}`。
- `GlobalWorkerOptions` 泛化为 `getWorkerSrcFor(type)`（`src/display/worker_options.js`，上游已有 `rendererSrc` 先例）。
- viewer 层：`PDFViewer._pages`/`PDFPageView` 对 `PageViewport`（PDF 用户空间、72dpi、Y 向上）和 op-list 合约的硬编码 → 抽象为「content item view + getViewport + render 合约」。

### 1.3 PDF 强耦合，原样保留为 PDF 引擎实现

`OPS` 表 + `canvas.js` 回放（4487 行）、`core/evaluator.js` 及全部 PDF 解析、`AnnotationLayer` 的 25+ PDF 注释子类型、`SaveDocument` 增量写、`PageViewport` 坐标系。这些不抽象、不动，pdf.js 整体降格为「PDF 引擎」。

---

## 2. EPUB 引擎选型：foliate-js 为基、多方取材

### 2.1 各项目资产 verdict

| 项目                 | 可搬                                                                                                                                                                                                                                                                                                                                                    | 只借鉴                                                                                                                                                                                                                | 不用                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **foliate-js** (MIT) | `epubcfi.js`(349 行，生态最佳)、`overlayer.js`(175 行，Range→SVG 高亮)、`search.js`+`text-walker.js`、paginator 的 `getVisibleRange`/`bisectNode` 二分可见 Range 算法与 `#anchor` 持久重锚定、book 接口契约本身（`load()`→URL、`createDocument()` 供搜索、`resolveHref→{index,anchor(doc)}`）、资源引用计数 blob URL 缓存、`transformTarget` 内容改写点 | spread 折叠与 zoom fit 算法                                                                                                                                                                                           | 整搬 paginator/fixed-layout 到 pdf.js viewer 体系内（渲染栈不同，只能在上层统一）；fixed-layout 标注是 TODO；search 全量主线程遍历（自认 extremely slow）        |
| **epub.js**          | OPF/NCX/container 解析 schema 与兼容性经验（NCX 回退、iBooks displayOptions）；CSS columns 具体配方 + 页宽取整 + forceEvenPages + writing-mode 轴翻转 + RTL（十年踩坑结晶）；`layout.js` 纯数学（260 行零 DOM）                                                                                                                                         | `section.load(request)` 注入式 request 函数                                                                                                                                                                           | `rendition.js`（1069 行 god class，destroy 大半被注释）、resources blob 替换管线（与 worker 化冲突）、@xmldom/xmldom fallback（与 CSS 选择器查询不兼容的半成品） |
| **zotero/epub.js**   | `remove-frontend` 分支的 diff = 「epub.js 哪些是解析、哪些是渲染」的精确清单；~7000 行删除线；shadow-DOM-aware CFI、Calibre CFI 兼容、XHTML 解析 fallback 等实战 patch（Gutenberg/Archive.org 语料）                                                                                                                                                    | 「删渲染层、解析 headless 化 + 自研视图」路线本身（= Zotero 7 已验证）                                                                                                                                                | 本地 master 与上游同步无改动，要看 `remove-frontend` 分支                                                                                                        |
| **koodo-reader**     | —                                                                                                                                                                                                                                                                                                                                                       | 统一 Rendition 接口（49 个 API 的形状）；位置模型多字段超集（text 锚点+chapterDocIndex+percentage+xpath，带版本号）；标注=格式无关引用+引擎自解释；平台能力回调注入；`PDFDataRangeTransport` 懒加载；PDF 双页占位空章 | kookit 闭源不可搬；66 处 `format==="PDF"` UI 泄漏是反面教材（能力查询必须接口化）                                                                                |
| **epubreader-js**    | —                                                                                                                                                                                                                                                                                                                                                       | 设置持久化、CFI 深链产品化细节                                                                                                                                                                                        | 架构无新东西；其源码自证 epub.js CFI 恢复定位不可靠                                                                                                              |

### 2.2 推荐组合

**EPUB 引擎 = foliate-js 的 parser + paginator + overlayer + epubcfi，以 foliate 的 book 接口为 EPUB 侧引擎契约**，原因：

1. MIT + 零依赖 + 纯 ES modules，可直接 vendor 进仓库锁定版本（其 API 不稳定、无版本发布，必须 vendor）。
2. book 接口（`sections[].load()→URL`）恰好切在 worker 化的天然边界上：worker/解析侧产字节与 URL，主线程 iframe 渲染。
3. renderer 与 CFI 完全解耦（只认 `{index, anchor(doc)}` / Range），换成任何格式引擎都能接。
4. 它的 MOBI/FB2/CBZ parser 附带免费——后续格式扩展的第一梯队。
5. epub.js 的 rendition/manager 技术债重，且 Zotero 已证明「只取其解析层」的路线；而 foliate 的解析层比 epub.js 的更干净（epub.js 的 CSS 选择器查询在 worker 里会部分 break）。

EPUB fixed-layout（pre-paginated）初期可先接 foliate 的 `fixed-layout.js`，标注层暂缓（其本身也是 TODO），后续自研。

---

## 3. 关键跨格式设计

### 3.1 DocumentEngine 接口（对 6 月版 Interface 的修订）

```typescript
interface DocumentEngine {
  readonly format: string;
  readonly capabilities: CapabilityFlags; // 能力查询接口化！禁止 UI 层 format 判断
  open(source): Promise<void>;
  getMetadata(): DocumentMetadata;
  getOutline(): TOCEntry[]; // PDF: outline / EPUB: toc

  // 定位原语：多字段超集（koodo 验证），schema 必须带版本号
  // { version, sectionIndex|page, cfi?, textAnchor?, percentage }
  goTo(location: Location): Promise<void>;
  getPosition(): Promise<Location>;
  resolveHref(href: string): Promise<{ index; anchor(doc): Range | Element | null }>; // foliate 语义

  // 内容交付：URL（DOM 栈）或 render 合约（canvas 栈），二选一由 capabilities 声明
  getSection(index): { load(): Promise<string> }; // reflowable
  getPage(index): { getViewport(scale); render(params) }; // fixed-layout

  getTextContent(): AsyncIterableIterator<TextChunk>; // 统一搜索索引源
  destroy(): void;
}
```

要点：

- **位置模型 = 多字段超集**：`text 锚点`（抗重排）+ `sectionIndex/page` + `cfi` + `percentage`（兜底/跨端同步）。PDF 的页码、EPUB 的 CFI 各自为强字段，percentage 永远可用。schema 加版本号（koodo 三代旧数据迁移是没版本化的代价）。
- **能力查询接口化**（`capabilities.textStyle / reflow / annotationEditing / tts`），UI 只查能力不查格式。
- **标注存储 = 格式无关引用 + 引擎自解释**：库里存 `{location, text, rangeData?, color, ...}`，EPUB 由 foliate overlayer（Range→SVG）画，PDF 由 pdf.js annotation layer 画。foliate 的 `overlayer.js` 两边通用（把 pdf.js textLayer 的文本 Range 喂给它即可）。
- **统一搜索 = 统一 getTextContent 索引**：PDF 走 worker textContent（现有模式），EPUB 用 foliate 的 `search.js` matcher + `createDocument()`；两边都产出「文本块 + 定位引用」，UI 的 findController 统一消费。注意 foliate search 慢，需分片/增量化。

### 3.2 分层架构（修订版）

```
┌────────────────────────────────────────────────────────┐
│  Viewer Shell（UI：toolbar/sidebar/find/annotations）   │
│  只依赖 Universal API + capabilities，零格式判断        │
├────────────────────────────────────────────────────────┤
│  Universal API（DocumentEngine / Location / Annotation）│
│  openDocument(type) 工厂 + 内容嗅探                    │
├──────────────────────┬─────────────────────────────────┤
│  PDF Engine（现有 pdf.js，基本不动）                   │  EPUB Engine（foliate-js vendor 化）
│  parse worker ──────► renderer worker / canvas         │  parser（初期主线程）+ paginator
│  textContent / outline / annotation storage            │  + overlayer + epubcfi
│  通信：MessageHandler（复用）                          │  通信：同进程对象（初期）
├──────────────────────┴─────────────────────────────────┤
│  Shared：MessageHandler / stream 协议 / PDFObjects 模式 │
│  / fake-worker 双模式 / getWorkerSrcFor(type)          │
└────────────────────────────────────────────────────────┘
```

### 3.3 Worker 化 EPUB 的边界（重要约束）

EPUB 解析的 DOM 依赖清单（foliate-js / epub.js 皆然）：

- `DOMParser`：worker 里不可用（foliate epub.js:815-945、mobi.js、fb2.js 均用）
- `URL.createObjectURL`：blob URL 只能在主线程生成（且是 iframe 加载载体）
- CSS 选择器查询：epub.js 的 `qsp`/`querySelector` 在 xmldom fallback 下会 break

因此 **EPUB 的 worker 化是渐进的，不是全有全无**：

- 第一阶段（可进 worker 的纯函数）：zip 字节层（@zip.js/zip.js 本身支持 worker，foliate 因 no-build 才关了 `useWebWorkers`）、`epubcfi.js` parse/compare/toString、`search.js` matcher、MOBI 的 PDB/HUFF/CDIC/PalmDOC 解压。
- 永远留主线程：XHTML 解析成 Document（DOMParser）、几何/分页计算（getComputedStyle、clientRect）、blob URL 生成。
- 这与 pdf.js 的模式同构：worker 干重活（字节 → 结构），主线程干 DOM/几何。

### 3.4 pdf.js 大流程的逐阶段套用（流程级复用）

本方案的底座不是「另起一套」，而是**把 pdf.js 的大流水线整套继承**：
`getDocument → Worker 握手 → worker 内解析 → 传输/代理层（DocumentProxy/PageProxy）→ render 合约（RenderTask）→ viewer（页视图 + 滚动/可见性调度）`。
约 6/7 的阶段可模式级甚至代码级复用，EPUB 引擎顺着同一条流程走：

| pdf.js 大流程阶段                                                         | EPUB 侧对应                                                                                            | 复用程度                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `getDocument(src)` 工厂 + 参数归一                                        | `openDocument(src)` 按内容嗅探（`%PDF` vs `PK` + mimetype）分派                                        | 模式复用，薄工厂                                                            |
| Worker 创建/握手/fake-worker 回退（`PDFWorker`、ready 消息、版本校验）    | EpubWorker 照抄同一套（MessageHandler + LoopbackPort 双模式）                                          | **代码级复用**                                                              |
| 数据供给（bytes 一次性 transfer，或 `GetReader/GetRangeReader` 流式拉取） | zip bytes 进 worker；worker 内解 zip 后按需取章节字节——同一个流协议                                    | **代码级复用**                                                              |
| worker 内解析 → 文档结构                                                  | container.xml/OPF/spine/toc 解析 → metadata/outline/sections                                           | 模式复用（解析器用 foliate 的）                                             |
| 代理层：`PDFDocumentProxy`（loadingTask/destroy/cleanup/`_transport`）    | `EpubDocumentProxy` 走同一 Transport 骨架（`WorkerTransport` 泛化为 `EngineTransport`）                | **结构性复用**，类很薄                                                      |
| `PDFPageProxy`（`getViewport/render/getTextContent`）                     | `EpubSectionProxy`：`layout(width,height,fontSize)` + `render({container})` + `getTextContent()`       | 接口形状复用                                                                |
| render 合约：参数 → `RenderTask`（promise/cancel/渐进回调）               | EPUB render 同样返回 RenderTask 形状（加载 iframe、等 `doc.fonts.ready`、布局完成 resolve，可 cancel） | 合约复用，执行体不同                                                        |
| viewer：页列表 + 交叉滚动观察 + scrollIntoView + 可见性调度               | 同一套滚动/调度机制，「页」对 EPUB 是「节/页化块」，视图子类 canvas → iframe                           | 大部分复用（`base_pdf_page_view.js`/`pdf_page_view.js` 的拆分已预演了这步） |

**真正的分叉只有三处**，且全部被 `DocumentEngine` 接口吸收在引擎边界之内，壳层始终只看到同一条流程（`open → proxy → render(RenderTask) → 事件`）：

1. **operator list 阶段没有对应物**。PDF 的「渲染数据」是 worker 产出的显示指令流（fnArray 分块、intent、渐进上屏）；EPUB 的「渲染数据」就是 DOM 本身（blob URL 交给浏览器排版）。`GetOperatorList` 流被替换为「章节文档交付」，渐进帧机制不适用。这是最深的分叉，但属于引擎内部——`render()` 合约对外形状不变。
2. **viewport/scale 模型不同**。PDF：几何内蕴，scale 只是缩放；EPUB：几何是排版产物，由 `layout(容器宽高, 字号)` 决定，页数在排版后才可知（对应 MuPDF `fz_layout_document` 之后 `countPages` 才稳定的语义）。代理层须接受「layout 后页数会变」。
3. **文本几何的时序不同**。PDF 的 textContent（带 transform 坐标）是文档内蕴属性，随时可取；EPUB 的文本几何只在 iframe 排版后才存在，字号/窗口一变即失效。EPUB 的 textContent/搜索/高亮几何必须由排版事件驱动（`relayout → 重新产出 {items, transform}`），而非请求-响应。这是 UI 层能感觉到的唯一实质差异。

另记：若追求壳层单栈，还存在「单栈统一」的三条路线及其代价——(a) EPUB 产统一绘制 IR → canvas：需要 JS 版浏览器排版引擎，无人做成，不可行；(b) 隐藏 iframe 排版 + 栅格化位图页（SumatraPDF Strategy A 的 web 版）：iframe 栈并未消失只是藏进引擎，且摧毁文本选择/无障碍，字号一变全量重排重栅格化；(c) 反向统一（PDF→HTML 文本，koodo 的 `PdfTextRender`）：仅适合文本型 PDF，图形 PDF 保真度崩坏，只能做可选模式。结论：贵的是画布之上的东西（选择/标注/搜索几何/无障碍），其 ground truth 在两种格式中根本不同，统一画布只统一最便宜的 20%。接口中保留 `capabilities.delivery: "canvas" | "dom" | "rasterized-dom"` 维度，未来若壳层痛感大，可在 EPUB 引擎内部加页化/栅格化输出适配层，无需推翻接口。

### 3.5 项目落点：基于 document-viewer monorepo（不新起项目）

**结论：宿主用已有的 `@document-kits/viewer`（github.com/Priestch/document-viewer，pnpm monorepo），不新起仓库。** 该项目正好承担本方案分层架构中的「Viewer Shell + 分发层」，并且已解决两个最高风险的基础设施问题：

1. **「pdf.js viewer 无官方 npm 包」**：已包装为 `@document-kits/viewer`（0.12.0-beta.2），直接消费 vendored 的 pdf.js 源码树（如 `src/plugin_manager.js` import `../pdf.js/src/display/annotation_layer.js`），framework-agnostic，带 CLI scaffolder/docs/demos。
2. **上游同步**：`upstream/` Rust 工具（oxc AST + lightningcss transform）+ `pdfjs:upgrade`/`pdfjs:smoke`/`syncWithUpstream` 脚本，把「追 pdf.js 上游」从手工 rebase 变成自动管线——直接缓解 §5 双渲染栈成本中的上游同步项。
3. **插件系统**（registerAnnotationType 等扩展点）已验证「包装 pdf.js 内部模块做扩展」的姿势。

**monorepo 演进结构**：

```
packages/
  document-viewer/   # 现有：壳层 + PDF 引擎接线（viewer 泛化在这里做）
  engine-core/       # 新增：DocumentEngine 接口、Location schema、capabilities、
                     #        openDocument 工厂、共享 transport
  epub-engine/       # 新增：foliate-js vendored + EpubDocumentProxy/EpubSectionProxy
                     #        + 渐进 worker 化
```

**三条工程约束**：

1. **不修改 vendored 的 synced 文件**（`packages/document-viewer/pdf.js/`）。viewer 泛化（`PDFPageView` → content item view、iframe 视图子类）只在 document-viewer 自有的 wrapper/subclass 里做（plugin 系统现有姿势即正确范例）。一旦改 synced 文件，Rust sync 管道失效。
2. **开工前先升级 vendored pdf.js**。当前停在 `ea34e5ccf`（4.4 时代，约 2024 年中），落后上游约两年——§1 复用清单中的 RendererWorker 模式、PagesMapper、`base_pdf_page_view.js` 拆分均在 newer 上游。此次升级同时是对 sync 工具的压力测试，须在编写任何 engine 代码之前完成。本调研仓库（pdf.js master clone，24176a946）留作升级时的架构参照。
3. **格式引擎是 first-class 层，不是 plugin**。引擎需控制生命周期/worker/位置模型，超出 plugin API 的合理范围；plugin 系统继续作为用户侧轻扩展机制，与 engine 层正交。

---

## 4. 分阶段落地路径

**Phase 0 — Spike（~1-2 周，在 document-viewer 仓库）**

- 升级 vendored pdf.js 至当前上游 master（压力测试 sync 工具；RendererWorker/PagesMapper 等新能力就位）。
- foliate-js vendor 进 monorepo（锁定 commit，其无版本发布），reader demo 跑通。
- 定义 `DocumentEngine` 接口 + `openDocument` 工厂雏形（内容嗅探：`%PDF` vs `PK` 头 + mimetype），落在新 `engine-core` 包。
- 验收：同一壳层按扩展名分别打开 PDF（现有 viewer）和 EPUB（foliate view）。

**Phase 1 — 统一文档模型（核心）**

- Universal API 落地：metadata/outline/location（多字段超集）/capabilities。
- Viewer shell 泛化：`PDFPageView` → content item view（canvas 子类 + iframe 子类）。
- 统一进度保存/恢复（Location schema v1，带版本号）。

**Phase 2 — 统一功能层**

- 统一搜索（双引擎 textContent → 统一 findController）。
- 统一标注（overlayer for EPUB + pdf.js annotation layer，共享存储模型）。
- EPUB fixed-layout 接入（foliate fixed-layout.js）。

**Phase 3 — EPUB worker 化 + 格式扩展**

- zip + CFI + 搜索索引进 worker（照抄 fake-worker 双模式与 createRendererWorkerBundle 构建样板）。
- MOBI/FB2/CBZ 几乎免费（foliate parser 现成）；XPS/其他走 MuPDF WASM 评估（走 canvas 栈，复用 RendererWorker 模式）。

---

## 5. 风险清单

| 风险                                                               | 等级                                                  | 缓解                                                                                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 双渲染栈长期维护成本                                               | 中（行业共识成本，SumatraPDF 的 Strategy A 代价更高） | 渲染栈薄：PDF 全用 pdf.js 原生、EPUB 全用 foliate，自研只做接口层                                                        |
| foliate-js API 不稳定（作者自述 "Expect it to break"）、无版本发布 | 中                                                    | vendor 锁定 commit；只依赖其 book 接口契约（README 明文），内部改动不外溢                                                |
| foliate fixed-layout 标注 TODO、search 慢                          | 中                                                    | 标注层自研（overlayer 是通用件）；search 分片/进 worker                                                                  |
| EPUB worker 化被 DOMParser 阻断                                    | 低（有明确边界方案）                                  | 按 3.3 切分，纯函数先行                                                                                                  |
| viewer 层「页」概念耦合（PageViewport/页码导航）                   | 中                                                    | PagesMapper 已开先例；iframe 视图不走 PageViewport，走自己的 viewport 概念                                               |
| pdf.js 集成方式的选择                                              | 已解决                                                | 落点为 document-viewer monorepo（本仓库）：pdf.js 以 submodule 形式 vendored + 自动同步管线，改动集中在自研层，详见 §3.5 |

---

## 6. 与 6 月调研的差异（增量结论）

1. 6 月的推荐「foliate-js 做解析引擎」经源码验证**成立且加强**：其 book 接口切面恰好是 worker 化边界，且 renderer/CFI 解耦让它能嵌进任意壳层。
2. 新增证据：Zotero 7（生产级同构产品）、koodo（统一 Rendition 接口 + 位置超集的正面验证与能力泄漏的反面教训）、pdf.js 上游已内置双 worker 架构（多 worker 并存可行性）。
3. 修正：6 月倾向于「PDF 走 pdf.js viewer、EPUB 走 foliate，在 View/文档模型层统一」——本次源码分析确认这是唯一现实路径，并给出了具体接口形状（foliate 语义的 `resolveHref→{index,anchor}` + 多字段 Location）。
4. 明确了 EPUB worker 化的现实边界（DOMParser/createObjectURL 约束），6 月报告中「EPUB 解析较轻、可留主线程」的判断在第一阶段成立，但搜索索引和 zip 层值得进 worker。

---

## 附：关键文件索引

> 注：以下 pdf.js/foliate-js 路径均相对各自仓库根；调研时使用的参考克隆位于 `~/Enter/pdf.js/`（pdf.js 上游 master clone）与 `~/Enter/pdf.js/foliate-js/`，其余参考项目（epub.js、koodo-reader、epubreader-js、zetero_epubjs）同在该目录下。

- pdf.js 双 worker：`src/display/renderer_worker.js`、`src/display/renderer_worker_proxy.js`、`src/pdf.renderer.js`
- pdf.js 消息层：`src/shared/message_handler.js`、`src/display/api_utils.js`（LoopbackPort）
- pdf.js worker 组织（待拆分点）：`src/core/worker.js` `createDocumentHandler`
- 构建样板：`gulpfile.mjs:671`（createRendererWorkerBundle 及其 5 处登记）
- foliate-js：`view.js`（组合点）、`paginator.js`（getVisibleRange/bisectNode: L63-151）、`epubcfi.js`、`overlayer.js`、`epub.js:932`（EPUB parser）、`pdf.js:115`（PDF PoC 适配，反面参照）
- zotero/epub.js：`remove-frontend` 分支（headless 化 diff）
- koodo：`src/models/BookLocation.ts`、`src/models/Note.ts`（位置/标注超集 schema）
