import { fileURLToPath } from "node:url";

import { viteStaticCopy } from "vite-plugin-static-copy";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const base = command === "build" ? "/document-viewer/demos/" : "/";
  return {
    base,
    plugins: [
      vue(),
      viteStaticCopy({
        targets: [
          {
            src: "node_modules/@document-kits/viewer/dist/generic/*",
            dest: "document-viewer",
          },
        ],
      }),
    ],
    // Used in dev mode
    // optimizeDeps: {
    //   include: ["@document-kits/viewer"],
    // },
    resolve: {
      alias: [
        {
          find: /^canvas$/,
          replacement: "canvas.js",
        },
        {
          // foliate 的 PDF 后端有 top-level await 且拖 26k 行 vendor，
          // bundler 会急切收录 makeBook 的动态 import——stub 掉（我们从不
          // 经 foliate 开 PDF）。见 @document-kits/epub-engine/foliate-pdf-stub.js
          find: /^foliate-js\/pdf\.js$/,
          replacement: fileURLToPath(
            new URL("../packages/epub-engine/src/foliate-pdf-stub.js", import.meta.url)
          ),
        },
      ],
    },
    // 允许 dev server 读取 monorepo 内文件（/@fs 导入，如 engine-demo.html）
    server: {
      fs: {
        allow: [".."],
      },
    },
  };
});
