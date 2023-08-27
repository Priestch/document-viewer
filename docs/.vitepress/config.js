const scriptContent = `
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-N4MC8X9M');
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
    lineNumbers: false,
  },
  head: [["script", {}, scriptContent]],
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "API", link: "/api" },
      { text: "Resources", link: "/resources" },
      { text: "Learn PDF.js", link: "/learn" },
      {
        text: "Links",
        items: [{ text: "Releases", link: "https://github.com/Priestch/document-viewer/tags" }],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/Priestch/document-viewer" },
      { icon: "discord", link: "https://discord.gg/hYXtcr37tz" },
    ],
  },
};

export default config;
