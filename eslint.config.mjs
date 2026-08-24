// ESLint 9 flat config for AuthePay.
// eslint-config-next@16 ships native flat configs, so we use them directly
// (no FlatCompat layer needed).
import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      "out/**",
      "build/**",
      "venv/**",
      "supabase/migrations/**",
    ],
  },
];

export default eslintConfig;