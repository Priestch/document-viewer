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
  const viewerOutputName = "component_viewer.js";

  const viewerFileConfig = createWebpackConfig(
    defines,
    {
      library: "component_viewer",
      filename: viewerOutputName,
      libraryTarget: "umd",
      umdNamedDefine: true,
    },
    {
      defaultPreferencesDir: options.defaultPreferencesDir,
    }
  );
  return gulp
    .src(ROOT_DIR + "/src/component_viewer.js")
    .pipe(webpack2Stream(viewerFileConfig))
}


function buildGenericApp(defines) {
  rimraf.sync(APP_DIR);

  merge(
    createAppBundle(defines, {}),
    createWebComponentBundle(defines, {
      defaultPreferencesDir: defines.SKIP_BABEL
        ? "generic/"
        : "generic-legacy/",
    }).pipe(gulp.dest(GENERIC_DIR + "web")),
  )
}

function copyToDist(done) {
  const options = { cwd: ROOT_DIR };
  gulp.src("pdf.js/build/**/*", options)
    .pipe(gulp.dest("dist", options));
  done();
}

gulp.task("app", gulp.series(
    "generic",
    function createGeneric(done) {
      console.log();
      console.log("### Creating generic document viewer");
      console.log(rimraf);
      console.log("root_dir", ROOT_DIR);
      const defines = builder.merge(DEFINES, { GENERIC: true });

      buildGenericApp(defines);

      done();
    },
    copyToDist
  )
)
