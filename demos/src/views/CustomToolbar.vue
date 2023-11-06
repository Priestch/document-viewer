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

function goPrevPage() {
  app$.value.eventBus.dispatch("previouspage");
}

function goNextPage() {
  app$.value.eventBus.dispatch("nextpage");
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
        <button @click="toggleOutline" class="menu-outline header-icon">
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 6H20V8H4V6ZM4 11H20V13H4V11ZM4 16H20V18H4V16Z" fill="black"></path>
          </svg>
        </button>
      </div>
      <div class="header-item">
        <button @click="goPrevPage" class="prev-page header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="22" height="22">
            <path d="M7.5,2l-4,4,4,4,1-1-3-3,3-3Z"></path>
          </svg>
        </button>
        <input class="page-input" type="text" :value="pageNumber$" @change="updatePageNumber" />
        <button @click="goNextPage" class="next-page header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="22" height="22">
            <path d="M4.5,10l4-4-4-4-1,1,3,3-3,3Z"></path>
          </svg>
        </button>
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
  height: 46px;
  display: flex;
  border-bottom: 1px solid #c7c7c7;
  background: #f9f9fa;
}

.header-item {
  flex: 1;
  display: flex;
  align-items: center;
  padding-left: 10px;
  padding-right: 10px;

  .header-icon {
    padding: 4px 4px;
    cursor: pointer;
    background: none;
    border: none;
    border-radius: 4px;
    outline: none;
    vertical-align: bottom;

    &:hover {
      background: #dcdcdc74;
    }
  }

  .prev-page {
    margin-right: 10px;
  }

  .next-page {
    margin-left: 10px;
  }
}

.page-input {
  width: 3em;
  outline: none;
  height: 2em;
  text-align: center;
}

.viewer-content {
  height: calc(100% - 47px);
}

:deep(.toolbar) {
  display: none;
}

.menu-outline {
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
