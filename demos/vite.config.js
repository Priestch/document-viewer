import { viteStaticCopy } from "vite-plugin-static-copy";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, ssrBuild }) => {
  const base = command === "build" ? "/document-viewer/demos/" : "/";
  console.log("base", base);
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
    optimizeDeps: {
      include: ["@document-kits/viewer"],
    },
    resolve: {
      alias: [
        {
          find: /^canvas$/,
          replacement: "canvas.js",
        },
      ],
    },
  };
});
