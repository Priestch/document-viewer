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
