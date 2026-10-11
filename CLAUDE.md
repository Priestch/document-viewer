# CLAUDE.md

## 仓库结构

- `packages/document-viewer/` — `@document-kits/viewer`：framework-agnostic 的 PDF viewer 壳层（本次改造主场）
  - `pdf.js/` — **git submodule（vendored upstream pdf.js）。绝不修改其中的任何文件**；扩展一律在本包 `src/` 里 subclass/wrap（参考 `src/plugin_manager.js` 的姿势）。同步由 `pnpm pdfjs:upgrade --to <commit>` 自动完成
  - `src/` — 自有代码（app_manager、plugin_manager 等）
- `packages/create-viewer/` — CLI scaffolder
- `website/` — 线上文档站（VitePress，包名 `viewer-docs`，发布到 GitHub Pages）
- `docs/` — **内部工程文档（不发布）**。开工前先读 `docs/plans/2026-10-11-universal-viewer-onboarding.md`
- `upstream/` — Rust 工具（oxc + lightningcss），pdf.js 同步时的代码 transform
- `scripts/` — pdfjs-upgrade / pdfjs-smoke / release

## 当前主线：Universal Viewer（PDF + EPUB）

背景、架构方案、Phase 0 开工清单见 `docs/plans/2026-10-11-universal-viewer-onboarding.md`。

工程红线（详见 onboarding §五）：

1. 不改 submodule（`packages/document-viewer/pdf.js/`）里的文件
2. UI 层零格式判断——用 `engine.capabilities` 查询，任何 `format === "..."` 出现在 UI 都是 bug
3. 格式引擎是 first-class 包（engine-core / epub-engine），不进 plugin 系统
4. Location schema 必须带版本号

## 常用命令

- `pnpm viewer:build` — 构建 viewer 包
- `pnpm pdfjs:upgrade --to <commit> [--dry-run]` — 升级 vendored pdf.js（自动 sync/build/smoke/delta 报告）
- `pnpm pdfjs:smoke` — 冒烟检查
- `pnpm demos:dev` / `pnpm docs:dev` — demos / 线上文档本地开发
