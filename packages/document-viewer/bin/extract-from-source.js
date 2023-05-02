const babel = require("@babel/core");
const fs = require("fs");
const path = require("path");
const t = require("@babel/types");
const generator = require("@babel/generator");
const prettier = require("prettier");

const globalObjName = "PDFViewerApplication";
const exportedName = "ViewerApplication";

const defaultExternalServicesFile = path.resolve(__dirname, "../src/default_external_services.js");
const helperFile = path.resolve(__dirname, "../src/app_helper.js");
const appFile = path.resolve(__dirname, "../src/default_app.js");

function getStringLiteral(start, end, hub) {
  return hub.file.code.slice(start, end);
}

function setComments(newNode, originalNode) {
  newNode.leadingComments = originalNode.leadingComments;
  newNode.trailingComments = originalNode.trailingComments;
  newNode.innerComments = originalNode.innerComments;
}

function createCallExpression(objName, propertyName, arguments) {
  const memberExpression = t.memberExpression(t.identifier(objName), t.identifier(propertyName));
  return t.callExpression(memberExpression, arguments);
}

function convertObjMethod(path) {
  const node = path.node;

  const body = node.body.body.map(function (statement) {
    if (
      t.isCallExpression(statement.expression) &&
      t.isIdentifier(statement.expression.callee.object, { name: globalObjName })
    ) {
      const callee = statement.expression.callee;
      const callExpression = createCallExpression(
        "this",
        callee.property.name,
        statement.expression.arguments
      );
      return t.expressionStatement(callExpression);
    }
    return statement;
  });

  const text = getStringLiteral(path.node.start, path.node.end, path.hub);
  let properties = [];
  if (/AppOptions/.test(text)) {
    properties.push(t.objectProperty(t.identifier("appOptions"), t.identifier("AppOptions")));
  }
  // if (/appConfig/.test(text) && !path.scope.hasBinding("appConfig")) {
  //   properties.push(t.objectProperty(t.identifier("appConfig"), t.identifier("appConfig")));
  // }
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
  const properties = [];
  const methods = [
    // t.classMethod('method', t.identifier('onCreate'), [], t.blockStatement([]))
  ];

  const nestedVisitor = {
    ObjectProperty(path) {
      const isInObjectMethod = path.findParent((path) => path.isObjectMethod());
      if (!isInObjectMethod) {
        const property = t.classProperty(t.identifier(path.node.key.name), path.node.value);
        setComments(property, path.node);

        properties.push(property);
      }
    },
    ObjectMethod(path) {
      const method = t.classMethod(
        path.node.kind,
        path.node.key,
        path.node.params,
        convertObjMethod(path),
        path.node.computed,
        path.node.static,
        path.node.generator,
        path.node.async
      );
      setComments(method, path.node);

      methods.push(method);
    },
  };

  path.traverse(nestedVisitor);

  const body = [
    ...properties,
    t.classMethod(
      "constructor",
      t.identifier("constructor"),
      [],
      t.blockStatement([
        // t.expressionStatement(createCallExpression("this", "onCreate", []))
      ])
    ),
    ...methods,
  ];

  return t.classDeclaration(t.identifier(exportedName), null, t.classBody(body));
}

function writeToFile(file, content) {
  fs.writeFile(file, content, function () {});
}

function updateDefaultExternalServices(path) {
  let content = getStringLiteral(path.node.start, path.node.end, path.hub);
  content = `import { shadow } from "pdfjs-lib";\n\n${content}\n\nexport { DefaultExternalServices };\n`;
  writeToFile(defaultExternalServicesFile, content);
}

function writeApp(instance) {
  const specifiers = [
    t.exportSpecifier(t.identifier(exportedName), t.identifier(exportedName)),
    t.exportSpecifier(
      t.identifier("PDFPrintServiceFactory"),
      t.identifier("PDFPrintServiceFactory")
    ),
  ];

  const importDeclarations = instance.importDeclarations.map(function (declaration) {
    const source = declaration.source.value.replace("./", "../pdf.js/web/");
    return t.importDeclaration(declaration.specifiers, t.stringLiteral(source));
  });
  const defaultExternalImport = t.importDeclaration(
    [
      t.importSpecifier(
        t.identifier("DefaultExternalServices"),
        t.identifier("DefaultExternalServices")
      ),
    ],
    t.stringLiteral("./default_external_services.js")
  );

  importDeclarations.push(defaultExternalImport);

  const program = t.program([
    ...importDeclarations,
    ...instance.otherDeclarations,
    instance.classDeclaration,
    t.exportNamedDeclaration(null, specifiers),
  ]);
  const result = generator.default(program);
  writeToFile(appFile, prettier.format(result.code, { parser: "babel" }));
}

function writeDefaultServices(instance) {
  const params = [t.identifier("PDFViewerApplication")];
  const body = [
    t.variableDeclaration("const", [
      t.variableDeclarator(
        t.identifier("AppOptions"),
        t.memberExpression(t.identifier("PDFViewerApplication"), t.identifier("appOptions"))
      ),
    ]),
    ...instance.helper_funcs,
    t.returnStatement(
      t.objectExpression(
        instance.returnValues.map(function (name) {
          return t.objectProperty(t.identifier(name), t.identifier(name));
        })
      )
    ),
  ];

  const specifiers = [
    t.exportSpecifier(t.identifier("createHelper"), t.identifier("createHelper")),
  ];
  const program = t.program([
    t.functionDeclaration(t.identifier("createHelper"), params, t.blockStatement(body)),
    t.exportNamedDeclaration(null, specifiers),
  ]);
  const result = generator.default(program);
  writeToFile(helperFile, prettier.format(result.code));
}

function transformObjToClass() {
  return {
    pre() {
      this.helper_funcs = [];
      this.returnValues = [];
      this.importDeclarations = [];
      this.classDeclaration = null;
      this.otherDeclarations = [];
    },
    visitor: {
      VariableDeclaration(path) {
        if (!t.isProgram(path.parent)) {
          return;
        }

        const validNames = [
          globalObjName,
          "PDFPrintServiceFactory",
          "FORCE_PAGES_LOADED_TIMEOUT",
          "ViewOnLoad",
          "ViewerCssTheme",
        ];

        function isValidDeclaration(node) {
          return (
            node.declarations.length === 1 && validNames.includes(node.declarations[0].id.name)
          );
        }

        if (isValidDeclaration(path.node)) {
          const declarator = path.node.declarations[0];

          // PDFViewerApplication variable declaration
          if (t.isIdentifier(declarator.id, { name: globalObjName })) {
            this.classDeclaration = traverseObj(declarator.id.name, path);
          } else {
            this.otherDeclarations.push(path.node);
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
      ImportDeclaration(path) {
        this.importDeclarations.push(path.node);
      },
    },
    post() {
      writeDefaultServices(this);
      writeApp(this);
    },
  };
}

function transformObj(code) {
  const options = {
    ast: true,
    // presets: ["@babel/preset-env"],
    plugins: [transformObjToClass],
  };
  return babel.transformSync(code, options);
}

const sourceFile = path.resolve(__dirname, "../pdf.js/web/app.js");

const sourceCode = fs.readFileSync(sourceFile, { encoding: "utf-8" });

transformObj(sourceCode);
