const Handlebars = require("handlebars");

Handlebars.registerHelper("equals", function compare(a, b, options) {
  if (a === b) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper("isDefined", function (value) {
  return value !== undefined;
});

Handlebars.registerHelper("getProperty", function (property, definedTypes) {
  let name = property.name;
  const definedType = definedTypes[property.type.names[0]];
  if (definedType && definedType.see) {
    name = `[${name}](${definedType.see[0]})`;
  }

  if (property.optional) {
    return name + " `optional`";
  }

  return name;
});
