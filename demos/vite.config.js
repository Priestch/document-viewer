import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";
import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
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
  resolve: {
    alias: [
      {
        find: /^canvas$/,
        replacement: "canvas.js",
      },
    ],
  },
});
