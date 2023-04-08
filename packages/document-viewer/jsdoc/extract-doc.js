const jsdoc2md = require("jsdoc-to-markdown");
const fs = require("fs-extra");
const path = require("path");

const definedTypes = {};

jsdoc2md
  .getTemplateData({
    files: ["./src/app_manager.js"],
  })
  .then((comments) => {
    const apiComments = comments.filter((comment) => {
      if (comment.customTags) {
        return comment.customTags?.find((t) => t.tag === "api");
      }
      return false;
    });
    const commitIds = new Set();
    const items = [];
    apiComments.forEach((comment) => {
      if (commitIds.has(comment.id)) {
        return;
      }
      commitIds.add(comment.id);
      if (comment.kind === "typedef") {
        definedTypes[comment.id] = comment;
      } else {
        comment.params = comment.params.map((param) => {
          return {
            value: param.type.names[0],
            ...param,
          };
        });
        comment.returns = comment.returns.map((item) => {
          return {
            value: item.type.names[0],
            ...item,
          };
        });
      }
      items.push({
        comment,
        definedTypes,
      });
    });

    console.log(definedTypes);

    jsdoc2md
      .render({
        data: items,
        template: "{{>api}}",
        partial: [path.resolve(__dirname, "./templates/api.hbs")],
        configure: path.resolve(__dirname, "./jsdoc.config.json"),
        helper: [path.resolve(__dirname, "./helper/index.js")],
      })
      .then((result) => {
        fs.writeFileSync(path.resolve(__dirname, "../../../docs/api.md"), result);
      });
  });
