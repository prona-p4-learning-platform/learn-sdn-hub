// @ts-check

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  eslintConfigPrettier,
  {
    // enable type checking for TypeScript files
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  {
    // disable type checking for plain JS files
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  {
    // disable warnings for require() calls in CJS files
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: ["static/", "dist/", "node_modules/"],
  },
);
