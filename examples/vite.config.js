import {defineConfig} from "vite";
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/document-viewer/dist/generic/*',
          dest: 'document-viewer',
        },
      ],
    }),
  ],
  optimizeDeps: {
    include: ['document-viewer']
  },
  build: {
    commonjsOptions: {
      // include: [/document-viewer/]
    },
  },
  resolve: {
    alias: [
      {
        find: /^canvas$/,
        replacement: 'canvas.js',
      },
    ],
  }
})