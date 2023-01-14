const scriptContent = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);};
  gtag('js', new Date());
  gtag('config', 'G-6648ZRLKLT');
`;

/**
 * @type {import('vitepress').UserConfig}
 */
const config = {
  title: "PDF Viewer",
  titleTemplate: "Free PDF Viewer build on PDF.js",
  description:
    "The free out-of-the-box PDF reader & viewer build on PDF.js. Integrate the PDF Viewer to your project at ease!",
  base: "/document-viewer/",
  lastUpdated: true,
  markdown: {
    lineNumbers: true,
  },
  head: [
    ["script", { src: "https://www.googletagmanager.com/gtag/js?id=G-6648ZRLKLT", async: true }],
    ["script", {}, scriptContent],
  ],
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "API", link: "/api" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/Priestch/document-viewer" }],
  },
};

export default config;
