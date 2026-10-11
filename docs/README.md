# docs/ — 内部工程文档

**这个目录是内部工作文档（给维护者和 coding agent 用），不发布到线上。**
线上文档站在 [`website/`](../website/)（VitePress，包名 `viewer-docs`，发布到 priestch.github.io/document-viewer）。

## 目录结构

- `plans/` — 按日期命名的工程计划、调研报告、决策记录
  - `2026-10-11-universal-viewer-onboarding.md` — **Universal Viewer（PDF+EPUB）开工指南**，新会话从这里开始
  - `2026-10-11-universal-viewer-feasibility.md` — 可行性评估报告（六个项目的源码级调研）
- `pdfjs:upgrade` 脚本自动生成的升级报告也会写到 `plans/`（`*-pdfjs-upgrade-auto*.md`）

## 约定

- 文件名：`YYYY-MM-DD-<slug>.md`
- 涉及架构决策的文档要有明确的「决定 + 理由 + 教训来源」结构（参考 onboarding 指南 §三）
- 本目录改动不触发 docs 部署 workflow（触发路径只含 `website/**`、`demos/**`）
