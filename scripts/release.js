/**
 * copied from https://github.com/vitejs/vite/blob/main/scripts/release.ts
 */
import prompts from "prompts";
import semver from "semver";
import colors from "picocolors";
import {
  args,
  getPackageInfo,
  getVersionChoices,
  isDryRun,
  logRecentCommits,
  packages,
  run,
  runIfNotDry,
  step,
  updateVersion,
  publishPackage,
  buildPackage,
} from "./releaseUtils";

async function main() {
  let targetVersion;

  const { pkg } = await prompts({
    type: "select",
    name: "pkg",
    message: "Select package",
    choices: packages.map((i) => ({ value: i, title: i })),
  });

  if (!pkg) return;

  await logRecentCommits(pkg);

  const { currentVersion, pkgName, pkgPath, pkgDir } = getPackageInfo(pkg);

  if (!targetVersion) {
    const { release } = await prompts({
      type: "select",
      name: "release",
      message: "Select release type",
      choices: getVersionChoices(currentVersion),
    });

    if (release === "custom") {
      const res = await prompts({
        type: "text",
        name: "version",
        message: "Input custom version",
        initial: currentVersion,
      });
      targetVersion = res.version;
    } else {
      targetVersion = release;
    }
  }

  if (!semver.valid(targetVersion)) {
    throw new Error(`invalid target version: ${targetVersion}`);
  }

  const tag = pkgName === "viewer" ? `v${targetVersion}` : `${pkgName}@${targetVersion}`;

  if (targetVersion.includes("beta") && !args.tag) {
    args.tag = "beta";
  }
  if (targetVersion.includes("alpha") && !args.tag) {
    args.tag = "alpha";
  }

  const { yes } = await prompts({
    type: "confirm",
    name: "yes",
    message: `Releasing ${colors.yellow(tag)} Confirm?`,
  });

  if (!yes) {
    return;
  }

  try {
    step("\ninstalling...");
    await runIfNotDry("pnpm", ["install", "--filter", `./packages/${pkgName}`]);
  } catch {
    const { yes } = await prompts({
      type: "confirm",
      name: "yes",
      message: "An error occurred while installing dependencies, do you want to continue?",
    });
    if (!yes) {
      return;
    }
  }

  step("\nBuilding package...");
  await buildPackage(pkgDir);

  step("\nUpdating package version...");
  updateVersion(pkgPath, targetVersion);

  // step('\nGenerating changelog...');
  // const changelogArgs = [
  //   'conventional-changelog',
  //   '-p',
  //   'angular',
  //   '-i',
  //   'CHANGELOG.md',
  //   '-s',
  //   '--commit-path',
  //   '.'
  // ];
  // if (pkgName !== 'vite') changelogArgs.push('--lerna-package', pkgName);
  // await run('npx', changelogArgs, { cwd: pkgDir });

  const { stdout } = await run("git", ["diff"], { stdio: "pipe" });
  if (stdout) {
    step("\nCommitting changes...");
    await runIfNotDry("git", ["add", "-A"]);
    await runIfNotDry("git", ["commit", "-m", `release: ${tag}`]);
    await runIfNotDry("git", ["tag", tag]);
  } else {
    console.log("No changes to commit.");
    return;
  }

  step("\nPushing...");
  await runIfNotDry("git", ["push", "origin", `refs/tags/${tag}`]);
  await runIfNotDry("git", ["push"]);

  if (isDryRun) {
    console.log("\nDry run finished - run git diff to see package changes.");
  } else {
    // console.log(
    //   colors.green(
    //     '\nPushed, publishing should starts shortly on CI.\nhttps://github.com/vitejs/vite/actions/workflows/publish.yml'
    //   )
    // );
    console.log(colors.green("\nPushed"));
  }

  step("\npublishing....");
  const releaseTag = tag.includes("beta") ? "beta" : tag.includes("alpha") ? "alpha" : undefined;
  await publishPackage(pkgDir, releaseTag);

  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
