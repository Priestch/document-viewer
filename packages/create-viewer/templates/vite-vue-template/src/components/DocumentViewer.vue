<script setup>
import { onMounted, ref } from "vue";
import { createViewerApp } from "@document-kits/viewer";
import "@document-kits/viewer/viewer.css";

const props = defineProps({
  options: Object,
});

const viewerRef = ref();

onMounted(() => {
  createViewerApp({ parent: viewerRef.value, ...props.options });
});
</script>

<template>
  <div class="document-viewer" ref="viewerRef"></div>
</template>

<style scoped>
.document-viewer {
  height: 100%;
}
</style>
