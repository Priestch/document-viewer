import{_ as s,c as a,o as n,Q as e}from"./chunks/framework.03d10376.js";const h=JSON.parse('{"title":"PDF Viewer","description":"","frontmatter":{},"headers":[],"relativePath":"get-started.md","filePath":"get-started.md","lastUpdated":1702035409000}'),p={name:"get-started.md"},l=e(`<h1 id="pdf-viewer" tabindex="-1">PDF Viewer <a class="header-anchor" href="#pdf-viewer" aria-label="Permalink to &quot;PDF Viewer&quot;">​</a></h1><p>An out-of-the-box PDF viewer builds on PDF.js.</p><h2 id="quick-start" tabindex="-1">Quick Start <a class="header-anchor" href="#quick-start" aria-label="Permalink to &quot;Quick Start&quot;">​</a></h2><p>You can use the starter to initialize a demo app to explore how to use this package in your own project.</p><div class="vp-code-group vp-adaptive-theme"><div class="tabs"><input type="radio" name="group-I-BLz" id="tab-pp86q8s" checked="checked"><label for="tab-pp86q8s">npm</label><input type="radio" name="group-I-BLz" id="tab-3_oPbqp"><label for="tab-3_oPbqp">pnpm</label></div><div class="blocks"><div class="language-bash vp-adaptive-theme active"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-dark vp-code-dark"><code><span class="line"><span style="color:#6A737D;"># initialize a demo project with a quick starter</span></span>
<span class="line"><span style="color:#B392F0;">npm</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">create</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">@document-kits/viewer@latest</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">my-app</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># There will be prompt to let you choose a template to start,</span></span>
<span class="line"><span style="color:#6A737D;"># currently only one \`vite-vue-template\` supported.</span></span>
<span class="line"></span>
<span class="line"><span style="color:#79B8FF;">cd</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">my-app</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># install dependencies</span></span>
<span class="line"><span style="color:#B392F0;">npm</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">install</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># run the dev server and open the default browser to view the demo</span></span>
<span class="line"><span style="color:#B392F0;">npm</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">run</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">dev</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">--open</span></span></code></pre><pre class="shiki github-light vp-code-light"><code><span class="line"><span style="color:#6A737D;"># initialize a demo project with a quick starter</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#24292E;"> </span><span style="color:#032F62;">create</span><span style="color:#24292E;"> </span><span style="color:#032F62;">@document-kits/viewer@latest</span><span style="color:#24292E;"> </span><span style="color:#032F62;">my-app</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># There will be prompt to let you choose a template to start,</span></span>
<span class="line"><span style="color:#6A737D;"># currently only one \`vite-vue-template\` supported.</span></span>
<span class="line"></span>
<span class="line"><span style="color:#005CC5;">cd</span><span style="color:#24292E;"> </span><span style="color:#032F62;">my-app</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># install dependencies</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#24292E;"> </span><span style="color:#032F62;">install</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># run the dev server and open the default browser to view the demo</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#24292E;"> </span><span style="color:#032F62;">run</span><span style="color:#24292E;"> </span><span style="color:#032F62;">dev</span><span style="color:#24292E;"> </span><span style="color:#005CC5;">--open</span></span></code></pre></div><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-dark vp-code-dark"><code><span class="line"><span style="color:#6A737D;"># initialize a demo project with a quick starter</span></span>
<span class="line"><span style="color:#B392F0;">pnpm</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">create</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">@document-kits/viewer@latest</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">my-app</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># There will be prompt to let you choose a template to start,</span></span>
<span class="line"><span style="color:#6A737D;"># currently only one \`vite-vue-template\` supported.</span></span>
<span class="line"></span>
<span class="line"><span style="color:#79B8FF;">cd</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">my-app</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># install dependencies</span></span>
<span class="line"><span style="color:#B392F0;">pnpm</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">install</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># run the dev server and open the default browser to view the demo</span></span>
<span class="line"><span style="color:#B392F0;">pnpm</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">run</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">dev</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">--open</span></span></code></pre><pre class="shiki github-light vp-code-light"><code><span class="line"><span style="color:#6A737D;"># initialize a demo project with a quick starter</span></span>
<span class="line"><span style="color:#6F42C1;">pnpm</span><span style="color:#24292E;"> </span><span style="color:#032F62;">create</span><span style="color:#24292E;"> </span><span style="color:#032F62;">@document-kits/viewer@latest</span><span style="color:#24292E;"> </span><span style="color:#032F62;">my-app</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># There will be prompt to let you choose a template to start,</span></span>
<span class="line"><span style="color:#6A737D;"># currently only one \`vite-vue-template\` supported.</span></span>
<span class="line"></span>
<span class="line"><span style="color:#005CC5;">cd</span><span style="color:#24292E;"> </span><span style="color:#032F62;">my-app</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># install dependencies</span></span>
<span class="line"><span style="color:#6F42C1;">pnpm</span><span style="color:#24292E;"> </span><span style="color:#032F62;">install</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># run the dev server and open the default browser to view the demo</span></span>
<span class="line"><span style="color:#6F42C1;">pnpm</span><span style="color:#24292E;"> </span><span style="color:#032F62;">run</span><span style="color:#24292E;"> </span><span style="color:#032F62;">dev</span><span style="color:#24292E;"> </span><span style="color:#005CC5;">--open</span></span></code></pre></div><h2 id="prepare-resources" tabindex="-1">Prepare Resources <a class="header-anchor" href="#prepare-resources" aria-label="Permalink to &quot;Prepare Resources&quot;">​</a></h2><p>PDF.js depends on some resources to work.</p><p>All the necessary resources are located in <code>node_modules/@document-kits/viewer/dist/generic/</code>. When building the app using a bundler, make sure to copy these resources.</p><h6 id="resource-list" tabindex="-1">Resource List <a class="header-anchor" href="#resource-list" aria-label="Permalink to &quot;Resource List&quot;">​</a></h6><ul><li><code>web/locale/viewer.properties</code> for i18n</li><li><code>web/viewer.css</code> for viewer style</li><li><code>build/pdf.worker.js</code></li><li><code>build/pdf.sandbox.js</code></li><li><code>web/standard_fonts/*</code></li></ul></div></div>`,5),o=[l];function t(r,c,i,d,y,u){return n(),a("div",null,o)}const m=s(p,[["render",t]]);export{h as __pageData,m as default};
