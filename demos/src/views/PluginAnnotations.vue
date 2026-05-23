<script setup>
import { onMounted, ref, shallowRef } from "vue";
import { injectApp } from "../examples/plugin-annotations";

const el$ = ref(null);
const app$ = shallowRef(null);

onMounted(function () {
  app$.value = injectApp(el$.value);
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
