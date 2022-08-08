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
  return gulp
    .src(ROOT_DIR + "/src/index.js")
    .pipe(webpack2Stream(viewerFileConfig))
    .pipe(replaceNonWebpackImport())
    .pipe(gulp.dest(APP_DIR));
}

function createWebComponentBundle(defines, options) {
  const viewerOutputName = "app.js";

  const viewerFileConfig = createWebpackConfig(
    defines,
    {
      library: "ViewerApp",
      filename: viewerOutputName,
      libraryTarget: "umd",
      umdNamedDefine: true,
    },
    {
      defaultPreferencesDir: options.defaultPreferencesDir,
    }
  );
  return gulp.src(ROOT_DIR + "/src/viewer.js").pipe(webpack2Stream(viewerFileConfig));
}

function copyToDist() {
  const options = { cwd: ROOT_DIR };
  return gulp.src("pdf.js/build/**/*", options).pipe(gulp.dest("dist", options));
}

function buildGenericApp(defines) {
  rimraf.sync(APP_DIR);

  return createWebComponentBundle(defines, {
    defaultPreferencesDir: defines.SKIP_BABEL ? "generic/" : "generic-legacy/",
  }).pipe(gulp.dest(GENERIC_DIR + "web"));
}

gulp.task(
  "app",
  gulp.series(
    function (done) {
      rimraf.sync(ROOT_DIR + "/dist");
      done();
    },
    "generic",
    function createGeneric() {
      console.log();
      console.log("### Creating generic document viewer");
      const defines = builder.merge(DEFINES, { GENERIC: true });

      return buildGenericApp(defines);
    },
    copyToDist
  )
);
