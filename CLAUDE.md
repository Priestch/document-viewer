# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库结构

- `packages/document-viewer/` — `@document-kits/viewer`：framework-agnostic 的 PDF viewer 壳层（本次改造主场）
  - `pdf.js/` — **git submodule（vendored upstream pdf.js）。绝不修改其中的任何文件**；扩展一律在本包 `src/` 里 subclass/wrap（参考 `src/plugin_manager.js` 的姿势）。同步由 `pnpm pdfjs:upgrade --to <commit>` 自动完成
  - `src/` — 自有代码（app_manager、plugin_manager 等）；viewer 直接消费 pdf.js 源码树（如 `import "../pdf.js/src/display/annotation_layer.js"`），不用 pdfjs-dist 构建产物
- `packages/create-viewer/` — CLI scaffolder
- `website/` — 线上文档站（VitePress，包名 `viewer-docs`，发布到 GitHub Pages）
- `docs/` — **内部工程文档（不发布）**。开工前先读 `docs/plans/2026-10-11-universal-viewer-onboarding.md`
- `upstream/` — Rust 工具（oxc + lightningcss），pdf.js 同步时的代码 transform
- `scripts/` — pdfjs-upgrade / pdfjs-smoke / release

## 当前主线：Universal Viewer（PDF + EPUB）

背景、架构方案、Phase 0 开工清单见 @docs/plans/2026-10-11-universal-viewer-onboarding.md（完整源码级调研在同目录 feasibility 报告）。

核心原则：**统一发生在文档模型/接口层，不发生在渲染层**——PDF 走 pdf.js 原生管线（worker → op-list → canvas），EPUB 走 iframe + CSS columns（foliate-js）。EPUB worker 化是渐进的：DOMParser、`URL.createObjectURL`、几何计算永远留在主线程。

Phase 0 顺序（先于一切 engine 代码）：升级 vendored pdf.js → vendor foliate-js（submodule 锁 commit）→ `engine-core` 包骨架（DocumentEngine 接口 + openDocument 工厂 + 内容嗅探）→ EPUB 最小通路 demo。

工程红线（详见 onboarding §五）：

1. 不改 submodule（`packages/document-viewer/pdf.js/`）里的文件
2. UI 层零格式判断——用 `engine.capabilities` 查询，任何 `format === "..."` 出现在 UI 都是 bug
3. 格式引擎是 first-class 包（engine-core / epub-engine），不进 plugin 系统
4. Location schema 一出生就带版本号（多字段超集：`sectionIndex|page`、`cfi`、`textAnchor`、`percentage`）
5. 接口层保留 `capabilities.delivery: "canvas" | "dom"` 维度

上游 pdf.js master 纯净克隆在 `~/Enter/pdf.js/`（内含 foliate-js、epub.js、koodo-reader 等参考项目；Zotero patch 在 `zetero_epubjs` 的远程分支 `remove-frontend`）。

## 常用命令

- `pnpm viewer:build` — 构建 viewer 包（内部跑 `bin/gulp.sh`，借用 vendored pdf.js 的 gulp）
- `pnpm pdfjs:upgrade --to <commit> [--dry-run]` — 升级 vendored pdf.js（自动 sync/build/smoke/delta 报告）
- `pnpm pdfjs:smoke` — 冒烟检查
- `pnpm demos:dev` / `pnpm docs:dev` — demos / 线上文档本地开发
- `pnpm lint` — ESLint（flat config，`eslint.config.mjs`）。注意 `packages/document-viewer/src/` 是 upstream 抽取的 sync 文件，lint 在那里只是 advisory——不要为消 lint 警告去改这些文件（会污染 sync delta）
- `pnpm fmt` — prettier（printWidth 99）；lint-staged + simple-git-hooks pre-commit 已配置——绝不绕过 hooks
- 无测试套件；验证改动用 demos + smoke
- 发布：根目录 `pnpm release`；commit 用 conventional commits（`feat:` / `chore:` / `release:`）
