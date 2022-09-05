<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import DocumentViewer from "./components/DocumentViewer.vue";

const options = {
  src: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
  resourcePath: "document-viewer",
  disableCORSCheck: true,
};
</script>

<template>
  <DocumentViewer :options="options" />
</template>

<style scoped></style>
