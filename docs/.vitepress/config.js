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
    "The out-of-the-box PDF reader & viewer built using vanilla Javascript based on PDF.js. " +
    "It's framework agnostic and easy to integrate!",
  base: "/document-viewer/docs",
  lastUpdated: true,
  markdown: {
    lineNumbers: false,
  },
  sitemap: {
    hostname: "https://priestch.github.io/document-viewer/docs/",
  },
  head: [
    ["script", {}, scriptContent],
    ["meta", { name: "msvalidate.01", content: "EF5BE1CFB010126F7E1CBCD05E624E67" }],
  ],
  themeConfig: {
    search: {
      provider: "local",
    },
    nav: [
      { text: "Home", link: "/" },
      { text: "Blog", link: "/blog" },
      { text: "API", link: "/api" },
      {
        text: "Links",
        items: [
          { text: "Npm Package", link: "https://www.npmjs.com/package/@document-kits/viewer" },
          { text: "Releases", link: "https://github.com/Priestch/document-viewer/tags" },
          { text: "Useful Resources", link: "/resources" },
          {
            text: "About PDF.js",
            items: [
              { text: "Learned Knowledge", link: "/learned-knowledge/" },
              { text: "Architecture", link: "/architecture" },
              { text: "Common Pitfalls", link: "/pitfalls" },
              {
                text: "Official FAQ",
                link: "https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions",
              },
            ],
          },
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
