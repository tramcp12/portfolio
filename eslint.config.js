const globals = require("globals");

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.browser
      }
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "always"]
    }
  }
];
