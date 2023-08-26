import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
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
    solid(),
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
