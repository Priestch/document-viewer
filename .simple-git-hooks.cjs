module.exports = {
  "pre-commit": "npx lint-staged",
  // "pre-push": "cd ../../ && npm run format",

  // All unused hooks will be removed automatically by default
  // but you can use the `preserveUnused` option like following to prevent this behavior

  // if you'd prefer preserve all unused hooks
  preserveUnused: true,

  // if you'd prefer preserve specific unused hooks
  // "preserveUnused": ["commit-msg"]
};
