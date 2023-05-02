const babel = require("@babel/core");
const fs = require("fs");
const path = require("path");
const t = require("@babel/types");
const generator = require("@babel/generator");

const globalObjName = "PDFViewerApplication";

const defaultExternalServicesFile = path.resolve(__dirname, "../src/default_external_services.js");
const helperFile = path.resolve(__dirname, "../src/helper.js");

function getStringLiteral(start, end, hub) {
  return hub.file.code.slice(start, end);
}

function convertObjMethod(path) {
  const node = path.node;

  const body = node.body.body.map(function (statement) {
    if (
      t.isCallExpression(statement.expression) &&
      t.isIdentifier(statement.expression.callee.object, { name: globalObjName })
    ) {
      const callee = statement.expression.callee;
      const memberExpression = t.memberExpression(
        t.identifier("this"),
        t.identifier(callee.property.name)
      );
      const callExpression = t.callExpression(memberExpression, statement.expression.arguments);
      return t.expressionStatement(callExpression);
    }
    return statement;
  });

  const text = getStringLiteral(path.node.start, path.node.end, path.hub);
  let properties = [];
  if (/AppOptions/.test(text)) {
    properties.push(t.objectProperty(t.identifier("AppOptions"), t.identifier("AppOptions")));
  }
  if (/appConfig/.test(text) && !path.scope.hasBinding("appConfig")) {
    properties.push(t.objectProperty(t.identifier("appConfig"), t.identifier("appConfig")));
  }
  if (properties.length) {
    const declarations = [t.variableDeclarator(t.objectPattern(properties), t.identifier("this"))];
    body.unshift(t.variableDeclaration("const", declarations));
  }

  return {
    ...node.body,
    body: body,
  };
}

function visitConditionalDeclaration(path, returnValues) {
  const visitor = {
    VariableDeclaration(path) {
      if (
        t.isVariableDeclaration(path.node) &&
        path.node.declarations.some((d) => t.isFunctionExpression(d.init))
      ) {
        path.node.declarations.forEach(function (declarator) {
          returnValues.push(declarator.id.name);
        });
      }
    },
  };

  path.traverse(visitor);
}

function traverseObj(name, path) {
  const body = [];
  const data = {};
  t.classDeclaration(t.identifier(name), null, t.classBody([]));
  const nestedVisitor = {
    ObjectProperty(path) {
      const isInObjectMethod = path.findParent((path) => path.isObjectMethod());
      if (!isInObjectMethod) {
        body.push(t.classProperty(t.identifier(path.node.key.name), path.node.value));
      }
    },
    ObjectMethod(path) {
      body.push(
        t.classMethod(
          path.node.kind,
          path.node.key,
          path.node.params,
          convertObjMethod(path),
          path.node.computed,
          path.node.static,
          path.node.generator,
          path.node.async
        )
      );
    },
  };

  path.traverse(nestedVisitor);

  return t.classDeclaration(t.identifier(name + "1"), null, t.classBody(body));
}

function updateDefaultExternalServices(path) {
  let content = getStringLiteral(path.node.start, path.node.end, path.hub);
  content = `import { shadow } from "pdfjs-lib";\n\n${content}\n\nexport { DefaultExternalServices };\n`;
  fs.writeFile(defaultExternalServicesFile, content, function () {});
}

function transformObjToClass() {
  return {
    pre() {
      this.helper_funcs = [];
      this.returnValues = [];
    },
    visitor: {
      VariableDeclaration(path) {
        if (path.node.declarations.length === 1) {
          const declarator = path.node.declarations[0];
          if (t.isIdentifier(declarator.id, { name: globalObjName })) {
            const classNode = traverseObj(declarator.id.name, path);
            path.insertAfter(classNode);
          }
        }
      },
      ClassDeclaration(path) {
        if (t.isIdentifier(path.node.id, { name: "DefaultExternalServices" })) {
          updateDefaultExternalServices(path);
        }
      },
      FunctionDeclaration(path) {
        if (t.isProgram(path.parent)) {
          this.helper_funcs.push(path.node);
          this.returnValues.push(path.node.id.name);
        }
      },
      IfStatement(path) {
        if (t.isProgram(path.parent)) {
          visitConditionalDeclaration(path, this.returnValues);
          this.helper_funcs.push(path.node);
        }
      },
    },
    post() {
      const params = [t.identifier("PDFViewerApplication")];
      const body = [
        t.variableDeclaration("const", [
          t.variableDeclarator(
            t.identifier("AppOptions"),
            t.memberExpression(t.identifier("PDFViewerApplication"), t.identifier("AppOptions"))
          ),
        ]),
        ...this.helper_funcs,
        t.returnStatement(
          t.objectExpression(
            this.returnValues.map((name) => {
              return t.objectProperty(t.identifier(name), t.identifier(name));
            })
          )
        ),
      ];

      const specifiers = [
        t.exportSpecifier(t.identifier("createHelpers"), t.identifier("createHelpers")),
      ];
      const program = t.program([
        t.functionDeclaration(t.identifier("createHelpers"), params, t.blockStatement(body)),
        t.exportNamedDeclaration(null, specifiers),
      ]);
      const result = generator.default(program);
      fs.writeFile(helperFile, result.code, function () {});
    },
  };
}

function transformObj(code) {
  const options = {
    ast: true,
    // presets: ["@babel/preset-env"],
    plugins: [transformObjToClass],
    comments: true,
  };
  return babel.transformSync(code, options);
}

const sourceFile = path.resolve(__dirname, "../pdf.js/web/app.js");

const sourceCode = fs.readFileSync(sourceFile, { encoding: "utf-8" });

transformObj(sourceCode);
