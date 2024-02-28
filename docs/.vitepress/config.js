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
  title: "Free PDF Viewer build on PDF.js",
  description:
    "The open source out-of-the-box PDF reader & viewer build on PDF.js. " +
    "It's built using vanilla Javascript and framework agnostic. " +
    "No matter what frontend framework your project are using, React.js, Vue.js, Solid.js, Lit, Angular, Svelte, etc." +
    "It should be easy to integrate!",
  base: "/document-viewer/docs",
  lastUpdated: true,
  markdown: {
    lineNumbers: false,
  },
  head: [["script", {}, scriptContent]],
  themeConfig: {
    search: {
      provider: "local",
    },
    nav: [
      { text: "Home", link: "/" },
      { text: "API", link: "/api" },
      { text: "Resources", link: "/resources" },
      {
        text: "Learn PDF.js",
        items: [
          { text: "Learned Knowledge", link: "/learned-knowledge/" },
          { text: "Architecture", link: "/architecture" },
          { text: "Common Pitfalls", link: "/pitfalls" },
          { text: "Threads Communication", link: "/communication" },
        ],
      },
      {
        text: "Links",
        items: [
          { text: "Npm Package", link: "https://www.npmjs.com/package/@document-kits/viewer" },
          { text: "Releases", link: "https://github.com/Priestch/document-viewer/tags" },
        ],
      },
      { text: "Demos", link: "https://priestch.github.io/document-viewer/demos/" },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/Priestch/document-viewer" },
      { icon: "discord", link: "https://discord.gg/hYXtcr37tz" },
    ],
  },
};

export default config;
