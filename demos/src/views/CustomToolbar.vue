<script setup>
import { onMounted, ref, shallowRef } from "vue";
import { injectApp } from "../examples/custom-toolbar.js";

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

function toggleOutline() {
  app$.value.pdfSidebar.toggle();
}

function updatePageNumber(evt) {
  const pageNumber = parseInt(evt.target.value, 10);
  app$.value.pdfViewer.currentPageNumber = pageNumber;
}
</script>

<template>
  <div class="pdf-viewer">
    <div class="viewer-header">
      <div class="header-item">
        <button @click="toggleOutline" class="menu-outline">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            width="22"
            height="22"
            viewBox="0 0 30 30"
          >
            <path
              d="M 3 7 A 1.0001 1.0001 0 1 0 3 9 L 27 9 A 1.0001 1.0001 0 1 0 27 7 L 3 7 z M 3 14 A 1.0001 1.0001 0 1 0 3 16 L 27 16 A 1.0001 1.0001 0 1 0 27 14 L 3 14 z M 3 21 A 1.0001 1.0001 0 1 0 3 23 L 27 23 A 1.0001 1.0001 0 1 0 27 21 L 3 21 z"
            ></path>
          </svg>
        </button>
      </div>
      <div class="header-item">
        <input class="page-input" type="text" :value="pageNumber$" @change="updatePageNumber" />
      </div>
    </div>
    <div ref="el$" class="viewer-content"></div>
  </div>
</template>

<style scoped>
.pdf-viewer {
  height: 100%;
}

.viewer-header {
  height: 40px;
  display: flex;
  border-bottom: 1px solid #c7c7c7;
  background: #f9f9fa;
}

.header-item {
  flex: 1;
  display: flex;
  align-items: center;
}

.page-input {
  width: 3em;
  outline: none;
  height: 2em;
  text-align: center;
}

.viewer-content {
  height: calc(100% - 40px);
}

:deep(.toolbar) {
  display: none;
}

.menu-outline {
  background: none;
  border: none;
  cursor: pointer;
  outline: none;
  padding: 0 8px;
  margin: 0;
}

:deep(.viewerContainer),
:deep(.sidebarContainer) {
  top: 0;
}

:deep(.thumbnailView) {
  width: 100%;
}
</style>
