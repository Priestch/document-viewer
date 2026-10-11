---
title: Universal Viewer 开工指南
description: 从 PDF-only 到 PDF+EPUB 通用文档查看器的背景、方案与第一步
---

# Universal Viewer 开工指南

> 配套文档：[2026-10-11 可行性评估报告](./2026-10-11-universal-viewer-feasibility.md)（完整调研：pdf.js 上游架构、epub.js、foliate-js、koodo-reader、zotero/epub.js、epubreader-js 六个项目的源码级分析）。本指南是它的「行动版」——只保留开工需要知道的东西。

## 一、我们要做什么

把 `@document-kits/viewer` 从 PDF-only 演进为 **PDF + EPUB 的通用文档查看器**，架构上为后续格式（MOBI / FB2 / CBZ / XPS…）预留引擎扩展位。

一句话架构：**统一发生在文档模型/接口层，不发生在渲染层。** PDF 走 pdf.js 原生管线（worker → operator list → canvas），EPUB 走 iframe + CSS columns（浏览器排版引擎）。两条渲染栈都各自隐藏在 `DocumentEngine` 接口之下，壳层（toolbar/sidebar/搜索/标注 UI）只面对同一条流程：`open → proxy → render(RenderTask) → 事件`。

为什么必须双栈（而不是都走 pdf.js canvas）：

- web 平台唯一产品级的 HTML/CSS 排版引擎就是浏览器自己，op-list 管线排不了 EPUB；
- 反过来把 PDF 塞进 iframe（foliate 的 PoC）搜索/标注残缺；
- 贵的不是画布，是画布之上的文本选择/标注几何/搜索/无障碍——这些的 ground truth 在两种格式里根本不同，统一画布只统一最便宜的 20%。
- 生产先例：Zotero 7、KOReader、Readium 全是双栈。

## 二、仓库现状地图（开工前先知道这些）

```
document-viewer/                     # pnpm monorepo
├── packages/document-viewer/        # @document-kits/viewer —— 壳层 + PDF 引擎接线（本次改造主场）
│   ├── pdf.js/                      # ★ git submodule，vendored pdf.js（当前 ea34e5ccf ≈ v4.4，2024 年中）
│   ├── src/                         # 自有代码（app_manager.js、plugin_manager.js 等，不来自 upstream）
│   └── bin/                         # gulp.sh（借 pdf.js 的 gulp 构建）、transform-html.js、gulpfile.template.js
├── packages/create-viewer/          # CLI scaffolder
├── upstream/                        # ★ Rust 工具（oxc AST + lightningcss），sync 时做代码/CSS transform
├── scripts/
│   ├── pdfjs-upgrade.mjs            # ★ 一键升级：pnpm pdfjs:upgrade --to <commit>（checkout → sync → build → smoke → delta 报告）
│   └── pdfjs-smoke.mjs              # 冒烟检查
└── docs/                            # VitePress 文档站（本文件所在）
```

三个关键机制：

1. **submodule + 自动同步**：`src/` 里的自有文件（SOURCE_CHECK_FILES：app_manager / app_helper / application_options / default_app / viewer_template 等）是从 upstream viewer 代码抽取改写的，升级时 `pdfjs:upgrade` 会做 delta 检查、跑 syncWithUpstream（`transform:html`）和 `extract:js`，再 build + smoke。
2. **插件系统**（0.12 新增）：`registerAnnotationType` / `PluginManager`（`src/plugin_manager.js`），已验证「import pdf.js 内部模块做包装扩展」的姿势。用户侧轻扩展走这里。
3. **直接消费 pdf.js 源码树**（非 pdfjs-dist 构建产物），如 `import "../pdf.js/src/display/annotation_layer.js"`。

## 三、目标架构（落地形态）

```
┌────────────────────────────────────────────────────────────┐
│ Viewer Shell（现有 UI 泛化：零格式判断，只查 capabilities）│
├────────────────────────────────────────────────────────────┤
│ engine-core（新包）：DocumentEngine 接口 / Location schema  │
│   / capabilities / openDocument(type) 工厂 + 内容嗅探      │
├──────────────────────────┬─────────────────────────────────┤
│ PDF 引擎（现有接线保持） │ EPUB 引擎（新包 epub-engine）    │
│ parse worker → canvas    │ foliate-js parser + paginator   │
│                          │ + overlayer + epubcfi           │
├──────────────────────────┴─────────────────────────────────┤
│ 复用 pdf.js 的：MessageHandler / 流协议 / fake-worker 双模式 │
└────────────────────────────────────────────────────────────┘
```

### DocumentEngine 接口核心（详细版见可行性报告 §3.1）

```typescript
interface DocumentEngine {
  readonly format: string
  readonly capabilities: CapabilityFlags   // 能力查询接口化，禁止 UI 层格式判断！
  open(source): Promise<void>
  getMetadata(): DocumentMetadata
  getOutline(): TOCEntry[]
  goTo(location: Location): Promise<void>   // Location = 多字段超集（见下）
  getPosition(): Promise<Location>
  resolveHref(href): Promise<{index, anchor(doc)}>  // foliate 语义
  getSection(index) | getPage(index)         // dom 交付 / canvas 交付，由 capabilities 声明
  getTextContent(): AsyncIterableIterator<TextChunk>
  destroy(): void
}
```

### 必须刻在脑子里的设计决定

| 决定                                 | 内容                                                                                                                                                          | 来源教训                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **位置模型 = 多字段超集**            | `{version, sectionIndex\|page, cfi, textAnchor, percentage}`：文本锚点抗重排、PDF 用页码、percentage 兜底。schema 带版本号                                    | koodo 三代旧数据无版本迁移之痛     |
| **能力查询接口化**                   | UI 只调 `engine.capabilities.xxx`，永远不出现 `format === "PDF"`                                                                                              | koodo 泄漏了 66 处进 22 个 UI 文件 |
| **标注 = 格式无关引用 + 引擎自解释** | 存储 `{location, text, rangeData, color}`；EPUB 用 foliate overlayer（Range→SVG）画，PDF 用 pdf.js annotation layer 画                                        | Zotero/koodo 共同验证              |
| **pdf.js 大流程整套继承**            | worker 握手/流协议/代理层/RenderTask/viewer 调度全部套用，EPUB 顺着走；只有三处分叉：op-list→ 章节文档交付、scale→layout(宽高,字号)、文本几何改为排版事件驱动 | 报告 §3.4 逐阶段映射表             |
| **EPUB worker 化是渐进的**           | zip 字节层 / epubcfi parse / 搜索索引可进 worker；DOMParser、URL.createObjectURL、几何计算永远主线程                                                          | foliate/epub.js 源码验证           |

### EPUB 引擎 = foliate-js（为什么是它、怎么用）

- MIT、零依赖、纯 ES modules、活跃维护（2026-05 仍有提交）；**无版本发布、API 不稳定（作者自述 "Expect it to break"）→ 必须以 submodule/vendor 锁定 commit**。
- 只依赖其明文契约（book 接口）：`sections[].load()→URL`、`createDocument()` 供搜索、`resolveHref/resolveCFI→{index, anchor(doc)}`、`isExternal`。内部变动不外溢。
- 直接搬的模块：`epubcfi.js`（349 行，生态最佳 CFI 实现）、`overlayer.js`（175 行，通用 Range→SVG 高亮，PDF 侧也能用）、`search.js` + `text-walker.js`、paginator 的 `getVisibleRange`/`bisectNode`（二分求可见 Range，定位精度核心）。
- 附赠：MOBI / FB2 / CBZ parser 现成——未来格式扩展第一梯队。
- 已知短板：fixed-layout 标注是 TODO（标注层需自研）；search 全量主线程遍历很慢（需分片/进 worker）。
- 不用 epub.js 的 rendition/manager（技术债重，destroy 大半被注释）；epub.js 的价值在 CSS columns 配方与 OPF/NCX 兼容性经验，Zotero fork（`remove-frontend` 分支）的解析健壮性 patch 值得参考。

## 四、开工清单（Phase 0，建议顺序）

### 第 1 步：升级 vendored pdf.js（最高优先级，先于一切 engine 代码）

```bash
pnpm pdfjs:upgrade --to 24176a946 --dry-run   # 先看 delta 报告，评估两个年代差距的改动面
pnpm pdfjs:upgrade --to 24176a946             # 真正执行（checkout → sync → extract → build → smoke）
```

- 当前 submodule 停在 `ea34e5ccf`（v4.4 时代），落后上游约两年、约 4000 个 PR。新版里我们要复用的关键能力都在：**RendererWorker（OffscreenCanvas 渲染 worker）**、**PagesMapper**、`base_pdf_page_view.js` 拆分、MessageHandler 增强。
- 跨度太大可能一次升不动，可分步（先升到 v5 系列最后一个 tag，再升 master）；每步跑 smoke。
- 这次升级同时是对 sync 工具链的压力测试——工具链暴露的问题要在写 engine 代码前修好。
- 参照：`~/Enter/pdf.js` 是上游 master 的纯净 clone（24176a946），查新架构直接看它。

### 第 2 步：vendor foliate-js

```bash
git submodule add https://github.com/johnfactotum/foliate-js.git packages/epub-engine/foliate-js
```

（或 subtree；与 pdf.js 保持 submodule 一致性即可。）锁定 commit，跑通其自带 `reader.html` demo。

### 第 3 步：engine-core 包骨架

新建 `packages/engine-core`，第一版只包含：

- `DocumentEngine` 接口 + `CapabilityFlags` 定义（照可行性报告 §3.1）；
- `openDocument(source)` 工厂 + 内容嗅探（`%PDF` 头 vs `PK` 头 + `mimetype` entry）；
- `Location` schema v1（多字段超集 + version 字段）；
- 把现有 PDF 接线包一个 `PdfEngine implements DocumentEngine` 适配层（壳层暂不改，先证明接口够表达 PDF）。

### 第 4 步：EPUB 最小通路 + 验收 demo

- `packages/epub-engine`：foliate book → `EpubEngine implements DocumentEngine`（初版全主线程，不做 worker）；
- viewer 侧加一个最简的分派入口：demo 页面上传 `.pdf` / `.epub` 各自打开；
- **验收标准：同一壳层按格式分派打开两种文件；进度保存/恢复用统一 Location schema 走通。**

（Phase 1+ —— viewer 泛化、统一搜索、统一标注、EPUB worker 化——见可行性报告 §4。）

## 五、工程红线（违反任何一条都会付出高额返工代价）

1. **不修改 `packages/document-viewer/pdf.js/`（submodule）里的任何文件。** 泛化一律在自有 src/ 里 subclass/wrap（plugin_manager.js 的姿势就是范例）。改 submodule = sync 管道报废 = 双渲染栈的上游同步成本复活。
2. **UI 层零格式判断。** 任何 `format === "..."` 出现在 UI 代码里都是 bug，改为 capabilities 查询。
3. **格式引擎不进 plugin 系统。** plugin 是用户侧轻扩展（自定义 annotation/toolbar）；引擎是 first-class 包，控制生命周期/worker/位置模型。
4. **Location schema 一出生就带版本号。**
5. **接口层保留 `capabilities.delivery: "canvas" | "dom"` 维度**——未来若壳层单栈化（EPUB 页化/栅格化输出），加适配层即可，不用推翻接口。

## 六、速查：调研核心结论索引

| 主题               | 结论                                                                                                                                   | 详见报告 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 可行性总判定       | 可行；统一在接口层，不在渲染层                                                                                                         | §0       |
| pdf.js 哪些能复用  | MessageHandler/流协议/RendererWorker 模式/PagesMapper 代码级复用；getDocument→openDocument 工厂、core/worker.js handler 拆分是两处重构 | §1       |
| 大流程逐阶段套用   | 8 阶段映射表；分叉仅 3 处（op-list/scale→layout/文本几何时序）                                                                         | §3.4     |
| 单栈统一为什么不行 | 三条路线及代价（绘制 IR 不可行 / 栅格化毁文本层 / PDF→HTML 只适合文本型）                                                              | §3.4 末  |
| EPUB 引擎选型      | foliate-js 为基 + 各项目取材 verdict 表                                                                                                | §2       |
| worker 化边界      | DOMParser/createObjectURL 永远主线程；zip/CFI/搜索索引先行                                                                             | §3.3     |
| 风险表             | 双栈维护/上游同步/foliate API 不稳定等                                                                                                 | §5       |

参考克隆位置（做对比研究时用）：`~/Enter/pdf.js/` 下有 `foliate-js/`、`epub.js/`、`koodo-reader/`、`epubreader-js/`、`zetero_epubjs/`；`zetero_epubjs` 的 Zotero 改动在远程分支 `remove-frontend`（本地 master 与上游同步，看不到 patch）。
