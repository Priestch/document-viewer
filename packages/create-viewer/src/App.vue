<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import DocumentViewer from "./components/DocumentViewer.vue";
import doc from "@document-kits/viewer/compressed.tracemonkey-pldi-09.pdf?url";

const options = {
  doc,
  resourcePath: "document-viewer",
};
</script>

<template>
  <DocumentViewer :options="options" />
</template>

<style scoped></style>
