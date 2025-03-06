import { createRouter, createWebHashHistory } from "vue-router";
import CustomToolbar from "../views/CustomToolbar.vue";
import MultipleFiles from "../views/MultipleFiles.vue";
import HomeView from "../views/HomeView.vue";

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
      component: CustomToolbar,
    },
    {
      path: "/multiple-pdf-files",
      name: "multiplePDFFiles",
      component: MultipleFiles,
    },
  ],
});

export default router;
