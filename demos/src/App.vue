<script setup>
import { RouterLink, RouterView, useRoute } from "vue-router";

const route = useRoute();

console.log("route", route);
</script>

<template>
  <aside>
    <nav>
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
  width: 100%;
  margin-inline-start: var(--sidebar-width);
}
</style>
