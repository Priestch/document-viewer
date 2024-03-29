import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
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
