import{_ as t,c as e,o as a,N as o}from"./chunks/framework.380fba35.js";const f=JSON.parse('{"title":"API","description":"","frontmatter":{},"headers":[],"relativePath":"api.md","lastUpdated":1681003515000}'),s={name:"api.md"},r=o('<h1 id="api" tabindex="-1">API <a class="header-anchor" href="#api" aria-label="Permalink to &quot;API&quot;">​</a></h1><h2 id="createviewerapp" tabindex="-1">createViewerApp <a class="header-anchor" href="#createviewerapp" aria-label="Permalink to &quot;createViewerApp&quot;">​</a></h2><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#C792EA;">function</span><span style="color:#A6ACCD;"> </span><span style="color:#82AAFF;">createViewerApp</span><span style="color:#89DDFF;">(</span><span style="color:#A6ACCD;font-style:italic;">options</span><span style="color:#89DDFF;">:</span><span style="color:#A6ACCD;"> </span><span style="color:#FFCB6B;">Options</span><span style="color:#89DDFF;">):</span><span style="color:#A6ACCD;"> </span><span style="color:#FFCB6B;">PDFViewerApplication</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">{}</span></span></code></pre></div><p>Create a viewer app.</p><ul><li><a href="#Options">Options</a></li></ul><h2 id="options" tabindex="-1">Options <a class="header-anchor" href="#options" aria-label="Permalink to &quot;Options&quot;">​</a></h2><h4 id="properties" tabindex="-1">properties <a class="header-anchor" href="#properties" aria-label="Permalink to &quot;properties&quot;">​</a></h4><table><thead><tr><th>name</th><th>type</th><th>description</th><th>defaultValue</th></tr></thead><tbody><tr><td>parent</td><td><code>HTMLElement</code></td><td>Element the PDF viewer render to.</td><td>-</td></tr><tr><td>src</td><td><code>string</code></td><td>The src of the PDF document.</td><td>-</td></tr><tr><td>resourcePath</td><td><code>string</code></td><td>The resource path of pdf.js.</td><td>-</td></tr><tr><td>disableCORSCheck <code>optional</code></td><td><code>boolean</code></td><td>Disable CORS check of pdf.js</td><td>false</td></tr><tr><td>appOptions <code>optional</code></td><td><code>object</code></td><td>Default app options of pdf.js</td><td>{}</td></tr></tbody></table>',8),p=[r];function d(n,c,l,i,h,_){return a(),e("div",null,p)}const A=t(s,[["render",d]]);export{f as __pageData,A as default};
