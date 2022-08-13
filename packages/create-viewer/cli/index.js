import fs from "fs";
import parser from "gitignore-parser";
import path from "path";
import glob from "tiny-glob/sync.js";
import prompts from "prompts/lib/index";

const gitIgnore = `
dist
.solid
.output
.vercel
.netlify
netlify

# dependencies
/node_modules

# IDEs and editors
/.idea
.project
.classpath
*.launch
.settings/

# Temp
gitignore

# System Files
.DS_Store
Thumbs.db
`;

function mkdirp(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    if (e.code === "EEXIST") return;
    throw e;
  }
}

async function main() {
  let projectName = process.argv[2];

  if (!projectName) {
    console.log(`Let's create a app to view document!`);
    console.log("");
    projectName = (
      await prompts({
        type: "text",
        name: "projectName",
        message: "Project name",
        initial: "viewer-app",
      })
    ).projectName;
  }

  const binPath = __filename;

  const templatesDir = path.join(path.parse(binPath).dir, "templates");
  const templates = fs
    .readdirSync(templatesDir)
    .filter((dir) => {
      return fs.statSync(path.join(templatesDir, dir)).isDirectory();
    })
    .map((dir) => {
      return {
        name: dir,
      };
    });

  const templateName = (
    await prompts({
      type: "select",
      name: "template",
      message: "Which template do you want to use?",
      choices: templates.map((template) => ({
        title: template.name,
        value: template.name,
      })),
      initial: 0,
    })
  ).template;

  console.log("Your selected template: ", templateName);

  const templateDir = path.join(templatesDir, templateName);

  const gitignore = parser.compile(gitIgnore);
  const files = glob("**/*", { cwd: templateDir }).filter(gitignore.accepts);

  mkdirp(projectName);
  files.forEach((file) => {
    const src = path.join(templateDir, file);
    const dest = path.join(projectName, file);

    if (fs.statSync(src).isDirectory()) {
      mkdirp(dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  });
}

main();
