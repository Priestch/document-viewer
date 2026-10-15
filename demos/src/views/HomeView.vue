<script setup>
import { onMounted, ref, shallowRef } from "vue";

const el$ = ref(null);
const app$ = shallowRef(null);
const pageNumber$ = ref(1);

onMounted(async function () {
  // the pdf.js viewer shell (~1MB) is a mount-time dynamic import so the
  // app shell stays small — the same chunk the engine demo's lazy
  // pdf-engine.js lands on when it opens a PDF
  const { injectApp } = await import("../examples/pdfjs");
  app$.value = injectApp(el$.value);
  app$.value.initializedPromise.then(function () {
    app$.value.eventBus.on("pagechanging", function (evt) {
      pageNumber$.value = evt.pageNumber;
    });
  });
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
