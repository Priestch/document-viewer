<script setup>
import { onMounted, ref, shallowRef } from "vue";
import { injectApp } from "../examples/pdfjs";

const el$ = ref(null);
const app$ = shallowRef(null);
const pageNumber$ = ref(1);

onMounted(function () {
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
