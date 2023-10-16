<script setup>
import { injectApps } from "../examples/multiple-files.js";
import { onMounted } from "vue";

onMounted(function () {
  injectApps();
});
</script>

<template>
  <div class="main">
    <div id="app1"></div>
    <div id="app2"></div>
  </div>
</template>

<style>
.main {
  display: flex;
  height: 100%;
  width: 100%;
}

#app1,
#app2 {
  height: 100%;
}

#app2 {
  width: 50%;
  float: right;
}

#app1 {
  width: 50%;
  float: left;
}

.thumbnailView {
  width: 100%;
}

.pdf-document-viewer * {
  box-sizing: initial;
}
</style>
