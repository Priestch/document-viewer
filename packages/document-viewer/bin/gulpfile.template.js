// cwd is pdf.js directory.
const cwd = process.cwd();

const APP_DIR = GENERIC_DIR + "web/component";
const ROOT_DIR = path.resolve(cwd, "..");

function createAppBundle(defines, options) {
  const viewerOutputName = "index.js";

  const viewerFileConfig = createWebpackConfig(
    defines,
    {
      filename: viewerOutputName,
    },
    {
      defaultPreferencesDir: options.defaultPreferencesDir,
    }
  );
  viewerFileConfig.resolve.alias["pdfjs-lib"] = path.resolve(ROOT_DIR, "src/pdf_js/index.js");

  return gulp
    .src(ROOT_DIR + "/src/index.js")
    .pipe(webpack2Stream(viewerFileConfig))
    .pipe(gulp.dest(APP_DIR));
}

function createLibraryBundle(defines) {
  const viewerOutputName = "app.js";

  const viewerFileConfig = createWebpackConfig(defines, {
    filename: viewerOutputName,
    library: {
      type: "module",
    },
  });
  viewerFileConfig.resolve.alias["pdfjs-lib"] = path.resolve(ROOT_DIR, "src/pdf_js/index.js");

  return gulp.src(ROOT_DIR + "/src/viewer.js").pipe(webpack2Stream(viewerFileConfig));
}

function copyToDist() {
  const options = { cwd: ROOT_DIR };
  return gulp.src("pdf.js/build/**/*", options).pipe(gulp.dest("dist", options));
}

function buildGenericApp(defines, dir) {
  fs.rmSync(dir, { recursive: true, force: true });

  return ordered([
    createLibraryBundle(defines).pipe(gulp.dest(dir + "build")),
    createWorkerBundle(defines).pipe(gulp.dest(dir + "build")),
    createSandboxBundle(defines).pipe(gulp.dest(dir + "build")),
    createWebBundle(defines, {
      defaultPreferencesDir: "generic/",
    }).pipe(gulp.dest(dir + "web")),
    gulp.src(COMMON_WEB_FILES, { base: "web/" }).pipe(gulp.dest(dir + "web")),
    gulp.src("LICENSE").pipe(gulp.dest(dir)),
    gulp
      .src(["web/locale/*/viewer.ftl", "web/locale/locale.json"], {
        base: "web/",
      })
      .pipe(gulp.dest(dir + "web")),
    createCMapBundle().pipe(gulp.dest(dir + "web/cmaps")),
    createStandardFontBundle().pipe(gulp.dest(dir + "web/standard_fonts")),

    preprocessHTML("web/viewer.html", defines).pipe(gulp.dest(dir + "web")),
    preprocessCSS("web/viewer.css", defines)
      .pipe(
        postcss([
          postcssDirPseudoClass(),
          discardCommentsCSS(),
          postcssNesting(),
          postcssDarkThemeClass(),
          autoprefixer(AUTOPREFIXER_CONFIG),
        ])
      )
      .pipe(gulp.dest(dir + "web")),

    gulp.src("web/compressed.tracemonkey-pldi-09.pdf").pipe(gulp.dest(dir + "web")),
  ]);
}

function overrideStyle() {
  const options = { cwd: ROOT_DIR };
  return gulp.src("src/assets/viewer.css", options).pipe(gulp.dest("dist/generic/web", options));
}

gulp.task(
  "app",
  gulp.series(
    createBuildNumber,
    "locale",
    function scriptingGeneric() {
      const defines = { ...DEFINES, GENERIC: true };
      return ordered([
        buildDefaultPreferences(defines, "generic/"),
        createTemporaryScriptingBundle(defines),
      ]);
    },
    async function prefsGeneric() {
      await parseDefaultPreferences("generic/");
    },
    function createGeneric() {
      console.log();
      console.log("### Creating generic document viewer");
      const defines = { ...DEFINES, GENERIC: true };

      return buildGenericApp(defines, GENERIC_DIR);
    },
    copyToDist,
    overrideStyle
  )
);
