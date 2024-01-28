import{_ as s,c as a,o as e,Q as n}from"./chunks/framework.03d10376.js";const u=JSON.parse('{"title":"Acknowledge","description":"","frontmatter":{},"headers":[],"relativePath":"learned-knowledge/index.md","filePath":"learned-knowledge/index.md","lastUpdated":1706429230000}'),l={name:"learned-knowledge/index.md"},o=n(`<h1 id="acknowledge" tabindex="-1">Acknowledge <a class="header-anchor" href="#acknowledge" aria-label="Permalink to &quot;Acknowledge&quot;">​</a></h1><blockquote><p>There are critical comments about the PDF.js project, they say it should be easier to integrate the default viewer. I understand them somehow as a developer who want to show a PDF quickly, but knowing the primary goal of an OSS project can help us to understand the trade-off decisions made by the maintainers.</p><p>All these are what I learned from the PDF.js project. It may not be accurate, but I hope it can help you to understand the PDF.js better.</p></blockquote><h1 id="table-of-contents" tabindex="-1">Table of Contents <a class="header-anchor" href="#table-of-contents" aria-label="Permalink to &quot;Table of Contents&quot;">​</a></h1><nav class="table-of-contents"><ul><li><a href="#background">Background</a></li><li><a href="#introduction">Introduction</a></li><li><a href="#pdfviewerapplication">PDFViewerApplication</a></li><li><a href="#appoptions">AppOptions</a><ul><li><a href="#option-kinds">Option Kinds</a></li><li><a href="#important-options">Important options</a></li></ul></li><li><a href="#important-events">Important Events</a></li><li><a href="#gulp-tasks">Gulp Tasks</a></li></ul></nav><h2 id="background" tabindex="-1">Background <a class="header-anchor" href="#background" aria-label="Permalink to &quot;Background&quot;">​</a></h2><p><a href="https://github.com/mozilla/pdf.js" target="_blank" rel="noreferrer">PDF.js</a> is an OSS project supported by Mozilla and developed using HTML5, It&#39;s goal is to create a general-purpose, web standards-based platform for rendering PDFs in the <strong>Firefox browser</strong>. Many people find out that it&#39;s hard to integrate it into project, it&#39;s <a href="#issues-talked-about-why-it-s-hard-to-integrate">somehow intentionally</a>.</p><p>It&#39;s not developed as a component or library you can easily integrate like most npm packages, because it&#39;s primary goal is to be used easily in <strong>Firefox browser</strong>, the goal doesn&#39;t match most developers expectations. It&#39;s the trade-off decision made by the maintainers, we should understand it.</p><h4 id="issues-talked-about-why-it-s-not-easy-to-integrate" tabindex="-1">Issues talked about why it&#39;s not easy to integrate <a class="header-anchor" href="#issues-talked-about-why-it-s-not-easy-to-integrate" aria-label="Permalink to &quot;Issues talked about why it&#39;s not easy to integrate&quot;">​</a></h4><ul><li><a href="https://github.com/mozilla/pdf.js/issues/5609#issuecomment-68530552" target="_blank" rel="noreferrer">Issue 5609</a></li><li><a href="https://github.com/mozilla/pdf.js/issues/9210#issuecomment-347834276" target="_blank" rel="noreferrer">Issue 9210</a></li><li><a href="https://github.com/mozilla/pdf.js/issues/7203#issuecomment-210510569" target="_blank" rel="noreferrer">Issue 7203</a></li></ul><h2 id="introduction" tabindex="-1">Introduction <a class="header-anchor" href="#introduction" aria-label="Permalink to &quot;Introduction&quot;">​</a></h2><p>PDF.js use <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API" target="_blank" rel="noreferrer">web worker</a> for better rendering performance.</p><p>A typical web application only has one bundle result, but PDF.js has at least 4 bundles, they are main, worker, sandbox and web bundles.</p><div class="language-javascript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">javascript</span><pre class="shiki github-dark has-highlighted-lines vp-code-dark"><code><span class="line"><span style="color:#6A737D;">// From https://github.com/mozilla/pdf.js/blob/master/gulpfile.mjs#L1001</span></span>
<span class="line"><span style="color:#F97583;">function</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">buildGeneric</span><span style="color:#E1E4E8;">(</span><span style="color:#FFAB70;">defines</span><span style="color:#E1E4E8;">, </span><span style="color:#FFAB70;">dir</span><span style="color:#E1E4E8;">) {</span></span>
<span class="line"><span style="color:#E1E4E8;">  rimraf.</span><span style="color:#B392F0;">sync</span><span style="color:#E1E4E8;">(dir);</span></span>
<span class="line"></span>
<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#F97583;">return</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">merge</span><span style="color:#E1E4E8;">([</span></span>
<span class="line highlighted"><span style="color:#E1E4E8;">    </span><span style="color:#B392F0;">createMainBundle</span><span style="color:#E1E4E8;">(defines).</span><span style="color:#B392F0;">pipe</span><span style="color:#E1E4E8;">(gulp.</span><span style="color:#B392F0;">dest</span><span style="color:#E1E4E8;">(dir </span><span style="color:#F97583;">+</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;build&quot;</span><span style="color:#E1E4E8;">)),</span></span>
<span class="line highlighted"><span style="color:#E1E4E8;">    </span><span style="color:#B392F0;">createWorkerBundle</span><span style="color:#E1E4E8;">(defines).</span><span style="color:#B392F0;">pipe</span><span style="color:#E1E4E8;">(gulp.</span><span style="color:#B392F0;">dest</span><span style="color:#E1E4E8;">(dir </span><span style="color:#F97583;">+</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;build&quot;</span><span style="color:#E1E4E8;">)),</span></span>
<span class="line highlighted"><span style="color:#E1E4E8;">    </span><span style="color:#B392F0;">createSandboxBundle</span><span style="color:#E1E4E8;">(defines).</span><span style="color:#B392F0;">pipe</span><span style="color:#E1E4E8;">(gulp.</span><span style="color:#B392F0;">dest</span><span style="color:#E1E4E8;">(dir </span><span style="color:#F97583;">+</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;build&quot;</span><span style="color:#E1E4E8;">)),</span></span>
<span class="line highlighted"><span style="color:#E1E4E8;">    </span><span style="color:#B392F0;">createWebBundle</span><span style="color:#E1E4E8;">(defines, {</span></span>
<span class="line"><span style="color:#E1E4E8;">      defaultPreferencesDir: defines.</span><span style="color:#79B8FF;">SKIP_BABEL</span></span>
<span class="line"><span style="color:#E1E4E8;">        </span><span style="color:#F97583;">?</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;generic/&quot;</span></span>
<span class="line"><span style="color:#E1E4E8;">        </span><span style="color:#F97583;">:</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;generic-legacy/&quot;</span><span style="color:#E1E4E8;">,</span></span>
<span class="line"><span style="color:#E1E4E8;">    }).</span><span style="color:#B392F0;">pipe</span><span style="color:#E1E4E8;">(gulp.</span><span style="color:#B392F0;">dest</span><span style="color:#E1E4E8;">(dir </span><span style="color:#F97583;">+</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;web&quot;</span><span style="color:#E1E4E8;">)),</span></span>
<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#6A737D;">// ...</span></span>
<span class="line"><span style="color:#E1E4E8;">  ]);</span></span>
<span class="line"><span style="color:#E1E4E8;">}</span></span></code></pre><pre class="shiki github-light has-highlighted-lines vp-code-light"><code><span class="line"><span style="color:#6A737D;">// From https://github.com/mozilla/pdf.js/blob/master/gulpfile.mjs#L1001</span></span>
<span class="line"><span style="color:#D73A49;">function</span><span style="color:#24292E;"> </span><span style="color:#6F42C1;">buildGeneric</span><span style="color:#24292E;">(</span><span style="color:#E36209;">defines</span><span style="color:#24292E;">, </span><span style="color:#E36209;">dir</span><span style="color:#24292E;">) {</span></span>
<span class="line"><span style="color:#24292E;">  rimraf.</span><span style="color:#6F42C1;">sync</span><span style="color:#24292E;">(dir);</span></span>
<span class="line"></span>
<span class="line"><span style="color:#24292E;">  </span><span style="color:#D73A49;">return</span><span style="color:#24292E;"> </span><span style="color:#6F42C1;">merge</span><span style="color:#24292E;">([</span></span>
<span class="line highlighted"><span style="color:#24292E;">    </span><span style="color:#6F42C1;">createMainBundle</span><span style="color:#24292E;">(defines).</span><span style="color:#6F42C1;">pipe</span><span style="color:#24292E;">(gulp.</span><span style="color:#6F42C1;">dest</span><span style="color:#24292E;">(dir </span><span style="color:#D73A49;">+</span><span style="color:#24292E;"> </span><span style="color:#032F62;">&quot;build&quot;</span><span style="color:#24292E;">)),</span></span>
<span class="line highlighted"><span style="color:#24292E;">    </span><span style="color:#6F42C1;">createWorkerBundle</span><span style="color:#24292E;">(defines).</span><span style="color:#6F42C1;">pipe</span><span style="color:#24292E;">(gulp.</span><span style="color:#6F42C1;">dest</span><span style="color:#24292E;">(dir </span><span style="color:#D73A49;">+</span><span style="color:#24292E;"> </span><span style="color:#032F62;">&quot;build&quot;</span><span style="color:#24292E;">)),</span></span>
<span class="line highlighted"><span style="color:#24292E;">    </span><span style="color:#6F42C1;">createSandboxBundle</span><span style="color:#24292E;">(defines).</span><span style="color:#6F42C1;">pipe</span><span style="color:#24292E;">(gulp.</span><span style="color:#6F42C1;">dest</span><span style="color:#24292E;">(dir </span><span style="color:#D73A49;">+</span><span style="color:#24292E;"> </span><span style="color:#032F62;">&quot;build&quot;</span><span style="color:#24292E;">)),</span></span>
<span class="line highlighted"><span style="color:#24292E;">    </span><span style="color:#6F42C1;">createWebBundle</span><span style="color:#24292E;">(defines, {</span></span>
<span class="line"><span style="color:#24292E;">      defaultPreferencesDir: defines.</span><span style="color:#005CC5;">SKIP_BABEL</span></span>
<span class="line"><span style="color:#24292E;">        </span><span style="color:#D73A49;">?</span><span style="color:#24292E;"> </span><span style="color:#032F62;">&quot;generic/&quot;</span></span>
<span class="line"><span style="color:#24292E;">        </span><span style="color:#D73A49;">:</span><span style="color:#24292E;"> </span><span style="color:#032F62;">&quot;generic-legacy/&quot;</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#24292E;">    }).</span><span style="color:#6F42C1;">pipe</span><span style="color:#24292E;">(gulp.</span><span style="color:#6F42C1;">dest</span><span style="color:#24292E;">(dir </span><span style="color:#D73A49;">+</span><span style="color:#24292E;"> </span><span style="color:#032F62;">&quot;web&quot;</span><span style="color:#24292E;">)),</span></span>
<span class="line"><span style="color:#24292E;">    </span><span style="color:#6A737D;">// ...</span></span>
<span class="line"><span style="color:#24292E;">  ]);</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><p>The default viewer uses the web bundle directly, it depends on the main and worker bundles. <strong>Keep in mind you must load the main bundle before using the default viewer</strong>. Each time a PDF document is opened using the <a href="https://github.com/mozilla/pdf.js/blob/a6e0b0292e8d8952576f55073ba3b8df69a2932a/web/app.js#L935" target="_blank" rel="noreferrer">open</a> method, it will create a new worker to render the PDF document.</p><p>The main bundle is built from <a href="https://github.com/mozilla/pdf.js/blob/master/src/pdf.js" target="_blank" rel="noreferrer"><code>src/pdf.js</code></a>, it&#39;s the entry of the main bundle. The worker bundle is built from <a href="https://github.com/mozilla/pdf.js/blob/master/src/pdf.worker.js" target="_blank" rel="noreferrer"><code>src/pdf.worker.js</code></a>, it&#39;s the entry of the worker bundle.</p><p>The <a href="https://github.com/mozilla/pdf.js/tree/master/web" target="_blank" rel="noreferrer"><code>src/web</code></a> directory contains the source code of the default viewer, all modules depend on the main bundle have to import from the <code>pdfjs-lib</code> package, it will be resolved to <code>web/pdfjs.js</code> using the <a href="https://webpack.js.org/configuration/resolve/#resolvealias" target="_blank" rel="noreferrer"><code>resolve.alias</code></a> option of webpack when building.</p><div class="language-javascript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">javascript</span><pre class="shiki github-dark vp-code-dark"><code><span class="line"><span style="color:#6A737D;">// web/pdfjs.js</span></span>
<span class="line"><span style="color:#6A737D;">// https://github.com/mozilla/pdf.js/blob/master/web/pdfjs.js</span></span>
<span class="line"><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> ((</span><span style="color:#F97583;">typeof</span><span style="color:#E1E4E8;"> PDFJSDev </span><span style="color:#F97583;">===</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;undefined&quot;</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">||</span><span style="color:#E1E4E8;"> PDFJSDev.</span><span style="color:#B392F0;">test</span><span style="color:#E1E4E8;">(</span><span style="color:#9ECBFF;">&quot;GENERIC&quot;</span><span style="color:#E1E4E8;">)) </span><span style="color:#F97583;">&amp;&amp;</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">!</span><span style="color:#E1E4E8;">globalThis.pdfjsLib) {</span></span>
<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#F97583;">await</span><span style="color:#E1E4E8;"> globalThis.pdfjsLibPromise;</span></span>
<span class="line"><span style="color:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F97583;">const</span><span style="color:#E1E4E8;"> {</span></span>
<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#79B8FF;">AbortException</span><span style="color:#E1E4E8;">,</span></span>
<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#6A737D;">// ...</span></span>
<span class="line"><span style="color:#E1E4E8;">} </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> globalThis.pdfjsLib;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F97583;">export</span><span style="color:#E1E4E8;"> {</span></span>
<span class="line"><span style="color:#E1E4E8;">  AbortException,</span></span>
<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#6A737D;">// ...</span></span>
<span class="line"><span style="color:#E1E4E8;">};</span></span></code></pre><pre class="shiki github-light vp-code-light"><code><span class="line"><span style="color:#6A737D;">// web/pdfjs.js</span></span>
<span class="line"><span style="color:#6A737D;">// https://github.com/mozilla/pdf.js/blob/master/web/pdfjs.js</span></span>
<span class="line"><span style="color:#D73A49;">if</span><span style="color:#24292E;"> ((</span><span style="color:#D73A49;">typeof</span><span style="color:#24292E;"> PDFJSDev </span><span style="color:#D73A49;">===</span><span style="color:#24292E;"> </span><span style="color:#032F62;">&quot;undefined&quot;</span><span style="color:#24292E;"> </span><span style="color:#D73A49;">||</span><span style="color:#24292E;"> PDFJSDev.</span><span style="color:#6F42C1;">test</span><span style="color:#24292E;">(</span><span style="color:#032F62;">&quot;GENERIC&quot;</span><span style="color:#24292E;">)) </span><span style="color:#D73A49;">&amp;&amp;</span><span style="color:#24292E;"> </span><span style="color:#D73A49;">!</span><span style="color:#24292E;">globalThis.pdfjsLib) {</span></span>
<span class="line"><span style="color:#24292E;">  </span><span style="color:#D73A49;">await</span><span style="color:#24292E;"> globalThis.pdfjsLibPromise;</span></span>
<span class="line"><span style="color:#24292E;">}</span></span>
<span class="line"></span>
<span class="line"><span style="color:#D73A49;">const</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">  </span><span style="color:#005CC5;">AbortException</span><span style="color:#24292E;">,</span></span>
<span class="line"><span style="color:#24292E;">  </span><span style="color:#6A737D;">// ...</span></span>
<span class="line"><span style="color:#24292E;">} </span><span style="color:#D73A49;">=</span><span style="color:#24292E;"> globalThis.pdfjsLib;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">  AbortException,</span></span>
<span class="line"><span style="color:#24292E;">  </span><span style="color:#6A737D;">// ...</span></span>
<span class="line"><span style="color:#24292E;">};</span></span></code></pre></div><p>As we can see from the code above, the web bundle must load the main bundle first. You can import from the result of <code>globalThis.pdfjsLibPromise</code> only when the main bundle promise is resolved.</p><div class="language-javascript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">javascript</span><pre class="shiki github-dark vp-code-dark"><code><span class="line"><span style="color:#6A737D;">// An example module in web/alt_text_manager.js depends main bundle.</span></span>
<span class="line"><span style="color:#6A737D;">//</span></span>
<span class="line"><span style="color:#6A737D;">// From https://github.com/mozilla/pdf.js/blob/master/web/alt_text_manager.js</span></span>
<span class="line"><span style="color:#F97583;">import</span><span style="color:#E1E4E8;"> { DOMSVGFactory, shadow } </span><span style="color:#F97583;">from</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;pdfjs-lib&quot;</span><span style="color:#E1E4E8;">;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F97583;">class</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">AltTextManager</span><span style="color:#E1E4E8;"> {</span></span>
<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#6A737D;">// ...</span></span>
<span class="line"><span style="color:#E1E4E8;">}</span></span></code></pre><pre class="shiki github-light vp-code-light"><code><span class="line"><span style="color:#6A737D;">// An example module in web/alt_text_manager.js depends main bundle.</span></span>
<span class="line"><span style="color:#6A737D;">//</span></span>
<span class="line"><span style="color:#6A737D;">// From https://github.com/mozilla/pdf.js/blob/master/web/alt_text_manager.js</span></span>
<span class="line"><span style="color:#D73A49;">import</span><span style="color:#24292E;"> { DOMSVGFactory, shadow } </span><span style="color:#D73A49;">from</span><span style="color:#24292E;"> </span><span style="color:#032F62;">&quot;pdfjs-lib&quot;</span><span style="color:#24292E;">;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#D73A49;">class</span><span style="color:#24292E;"> </span><span style="color:#6F42C1;">AltTextManager</span><span style="color:#24292E;"> {</span></span>
<span class="line"><span style="color:#24292E;">  </span><span style="color:#6A737D;">// ...</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h2 id="pdfviewerapplication" tabindex="-1">PDFViewerApplication <a class="header-anchor" href="#pdfviewerapplication" aria-label="Permalink to &quot;PDFViewerApplication&quot;">​</a></h2><p>The global <a href="https://github.com/mozilla/pdf.js/blob/a6e0b0292e8d8952576f55073ba3b8df69a2932a/web/app.js#L91" target="_blank" rel="noreferrer"><code>PDFViewerApplication</code></a> object is the entry of the default viewer of PDF.js, it glues all the modules together, and provides the API for the default viewer.</p><h2 id="appoptions" tabindex="-1">AppOptions <a class="header-anchor" href="#appoptions" aria-label="Permalink to &quot;AppOptions&quot;">​</a></h2><p>There are dozens of options in PDF.js, and they all belong to four kinds for now. You may wonder why there are so many options, and what they mean at the first time. This document will help you to understand them.</p><p>Let&#39;s crack on them one by one!</p><h3 id="option-kinds" tabindex="-1"><a href="https://github.com/mozilla/pdf.js/blob/34506f8874ce86ea21b9db54d0552947208bf4bb/web/app_options.js#L43" target="_blank" rel="noreferrer">Option Kinds</a> <a class="header-anchor" href="#option-kinds" aria-label="Permalink to &quot;[Option Kinds](https://github.com/mozilla/pdf.js/blob/34506f8874ce86ea21b9db54d0552947208bf4bb/web/app_options.js#L43)&quot;">​</a></h3><ul><li>VIEWER</li><li>API</li><li>WORKER</li><li>PREFERENCE</li></ul><h3 id="important-options" tabindex="-1">Important options <a class="header-anchor" href="#important-options" aria-label="Permalink to &quot;Important options&quot;">​</a></h3><ul><li><code>defaultUrl</code></li><li><code>locale</code></li><li><code>workerSrc</code></li><li><code>sandboxBundleSrc</code></li></ul><h4 id="defaulturl" tabindex="-1">defaultUrl <a class="header-anchor" href="#defaulturl" aria-label="Permalink to &quot;defaultUrl&quot;">​</a></h4><ul><li>Type <code>URL | string | Uint8Array</code></li></ul><p>The url of the PDF file. If you got <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS" target="_blank" rel="noreferrer">CORS</a> issue when loading a PDF file from a different origin, see details at <a href="/document-viewer/docs/pitfalls.html#origin-not-match">origin match error</a> section in common pitfalls page .</p><h4 id="locale" tabindex="-1">locale <a class="header-anchor" href="#locale" aria-label="Permalink to &quot;locale&quot;">​</a></h4><ul><li>Type <code>string</code></li><li>Default <code>en-US</code></li></ul><p>The locale of the viewer, it easy to switch a different locale by setting this option. See all supported locales in folder <a href="https://github.com/mozilla/pdf.js/tree/master/l10n" target="_blank" rel="noreferrer">l10n</a>.</p><h2 id="important-events" tabindex="-1">Important Events <a class="header-anchor" href="#important-events" aria-label="Permalink to &quot;Important Events&quot;">​</a></h2><h4 id="documentinit" tabindex="-1"><code>documentinit</code> <a class="header-anchor" href="#documentinit" aria-label="Permalink to &quot;\`documentinit\`&quot;">​</a></h4><p>Emitted after called the <code>setInitialView</code> method to show the initial view successfully. After the event is emitted, the viewer will be ready to use.</p><h4 id="documenterror" tabindex="-1"><code>documenterror</code> <a class="header-anchor" href="#documenterror" aria-label="Permalink to &quot;\`documenterror\`&quot;">​</a></h4><p>Emitted after error occurred when rendering document.</p><h4 id="pagerendered" tabindex="-1"><code>pagerendered</code> <a class="header-anchor" href="#pagerendered" aria-label="Permalink to &quot;\`pagerendered\`&quot;">​</a></h4><p>Emitted after each page is rendered successfully.</p><h2 id="gulp-tasks" tabindex="-1">Gulp Tasks <a class="header-anchor" href="#gulp-tasks" aria-label="Permalink to &quot;Gulp Tasks&quot;">​</a></h2>`,42),p=[o];function t(r,c,i,d,y,E){return e(),a("div",null,p)}const b=s(l,[["render",t]]);export{u as __pageData,b as default};
