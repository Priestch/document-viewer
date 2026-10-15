import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

// Views are lazy so each example page (and the heavy packages it pulls —
// the pdf.js viewer shell lives in four of them) only loads when visited.
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/custom-toolbar",
      name: "customToolbar",
      component: () => import("../views/CustomToolbar.vue"),
    },
    {
      path: "/multiple-pdf-files",
      name: "multiplePDFFiles",
      component: () => import("../views/MultipleFiles.vue"),
    },
    {
      path: "/plugin-annotations",
      name: "pluginAnnotations",
      component: () => import("../views/PluginAnnotations.vue"),
    },
    {
      path: "/engine",
      name: "engineDemo",
      component: () => import("../views/EngineDemo.vue"),
    },
  ],
});

export default router;
