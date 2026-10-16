<script setup>
import { RouterLink, RouterView, useRoute } from "vue-router";

const route = useRoute();

console.log("route", route);
</script>

<template>
  <aside>
    <nav>
      <RouterLink class="nav-link" :class="{ active: route.path === '/' }" to="/"
        >PDF Reader</RouterLink
      >
      <RouterLink
        class="nav-link"
        :class="{ active: route.path === '/custom-toolbar' }"
        to="/custom-toolbar"
        >Custom Toolbar</RouterLink
      >
      <RouterLink
        class="nav-link"
        :class="{ active: route.path === '/multiple-pdf-files' }"
        to="/multiple-pdf-files"
        >Multiple PDF</RouterLink
      >
      <RouterLink
        class="nav-link"
        :class="{ active: route.path === '/plugin-annotations' }"
        to="/plugin-annotations"
        >Plugin Annotations</RouterLink
      >
      <RouterLink class="nav-link" :class="{ active: route.path === '/engine' }" to="/engine"
        >Dual Engine</RouterLink
      >
    </nav>
  </aside>

  <main>
    <RouterView />
  </main>
</template>

<style scoped>
aside {
  width: var(--sidebar-width);
  height: 100%;
  z-index: 101;
  border-right: 1px solid #c7c7c7;
  position: fixed;
  left: 0;
  top: 0;
  background: #f9f9fa;
}

a:visited {
  color: unset;
}

.nav-link {
  display: block;
  height: 3em;
  line-height: 3em;
  padding-left: 1em;
}

.nav-link.active {
  font-weight: bold;
  background: rgba(0, 0, 0, 0.1);
}

main {
  height: 100%;
  width: calc(100% - var(--sidebar-width));
  min-width: 0;
  margin-inline-start: var(--sidebar-width);
}

@media (max-width: 760px) {
  aside {
    width: 100%;
    height: 48px;
    border-right: 0;
    border-bottom: 1px solid #c7c7c7;
  }

  nav {
    display: flex;
    overflow-x: auto;
    height: 100%;
  }

  .nav-link {
    flex: none;
    padding-inline: 12px;
    line-height: 48px;
  }

  main {
    width: 100%;
    margin-inline-start: 0;
    padding-top: 48px;
    box-sizing: border-box;
  }
}
</style>
