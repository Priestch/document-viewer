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
  padding: 1em 0.5em;
  width: var(--sidebar-width);
  height: 100%;
  z-index: 101;
  border-right: 1px solid #c7c7c7;
  position: fixed;
  left: 0;
  top: 0;
  background: gainsboro;
}

a:visited {
  color: unset;
}

.nav-link {
  display: block;
}

.nav-link.active {
  color: #00bd7e;
}

main {
  height: 100%;
  width: 100%;
  margin-inline-start: var(--sidebar-width);
}
</style>
