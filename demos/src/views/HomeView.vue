<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const el$ = ref(null);
let app;
let disposed = false;

onMounted(async function () {
  // the pdf.js viewer shell (~1MB) is a mount-time dynamic import so the
  // app shell stays small — the same chunk the engine demo's lazy
  // pdf-engine.js lands on when it opens a PDF
  const { injectApp } = await import("../examples/pdfjs");
  if (!disposed) {
    app = injectApp(el$.value);
  }
});

onBeforeUnmount(() => {
  disposed = true;
  app?.testingClose();
});
</script>

<template>
  <div ref="el$" class="pdf-viewer"></div>
</template>

<style scoped>
.pdf-viewer {
  height: 100%;
}
</style>
