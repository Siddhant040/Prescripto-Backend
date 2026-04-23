import js from "@eslint/js"
import globals from "globals"
import { defineConfig } from "eslint/config"

export default defineConfig([
  {
    ignores: ["node_modules", "logs"],
  },
  {
    files: ["**/*.js"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-undef": "error",
      "eqeqeq": "error",
      "curly": "error",
      "no-var": "error",
      "prefer-const": "warn"
    }
  }
])