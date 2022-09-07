const jsdoc2md = require("jsdoc-to-markdown");
const fs = require("fs-extra");
const path = require("path");

const types = {};
const interfaces = {};

let typesDoc = [];

// jsdoc2md
//   .getTemplateData({
//     files: ["./src/app_manager.js"],
//   })
//   .then((comments) => {
//     const apiComments = comments.filter((comment) => {
//       if (comment.customTags) {
//         return comment.customTags?.find((t) => t.tag === "api");
//       }
//       return false;
//     });
//     apiComments.forEach((comment) => {
//       if (comment.kind === "typedef") {
//         types[comment.id] = comment;
//       } else if (comment.kind === "function") {
//         interfaces[comment.id] = comment;
//       }
//     });
//
//     console.log("types", types);
//     console.log("interfaces", interfaces.createViewerApp.params);
//     Object.keys(types).forEach((key) => {
//       const definedType = types[key];
//       typesDoc.push(`##${definedType.id}`)
//       definedType.properties.forEach((property) => {
//         let properties = [];
//         properties.push(`###${property.name}`)
//         if (property.description) {
//           properties.push(`${property.description}\n`)
//         }
//         if (property.type) {
//           properties.push(`type: ${property.type.names[0]}`)
//         }
//         // console.log(property);
//         typesDoc.push(properties.join('\n'));
//       })
//     })
//   });

jsdoc2md
  .render({
    files: ["./src/app_manager.js"],
    template: "{{>api}}",
    partial: [path.resolve(__dirname, "./templates/api.hbs")],
    configure: "./jsdoc.config.json",
    helper: [path.resolve(__dirname, "./helper/index.js")],
  })
  .then((result) => {
    fs.writeFileSync(path.resolve(__dirname, "../../../docs/api.md"), result);
  });
