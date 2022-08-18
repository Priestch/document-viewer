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
  title: "DocumentViewer",
  description: "An out-of-the-box PDF document viewer",
  base: "/document-viewer/",
  lastUpdated: true,
  markdown: {
    lineNumbers: true,
  },
  head: [
    ["script", { src: "https://www.googletagmanager.com/gtag/js?id=G-6648ZRLKLT", async: true }],
    ["script", {}, scriptContent],
  ],
};

export default config;
