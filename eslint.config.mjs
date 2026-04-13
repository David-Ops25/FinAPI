import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import security from "eslint-plugin-security";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: false
      },
      globals: {
        process: "readonly",
        console: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      security
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...security.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },
  {
    ignores: ["dist/**", "node_modules/**"]
  }
];
