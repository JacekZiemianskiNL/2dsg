import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const restrict = (...patterns) => ["error", { patterns }];

const noAppImports = {
  regex: "^@devmentor/app(/|$)",
  message: "Packages must not import from @devmentor/app.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "packages/app/" },
    },
  },
  {
    // Packages import each other by name (@devmentor/<pkg>), never by relative path.
    files: ["packages/**/*.{ts,tsx,mjs}"],
    rules: {
      "import/no-relative-packages": "error",
    },
  },
  {
    files: ["packages/{db,ui}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(noAppImports),
    },
  },
  {
    // core stays framework-agnostic and depends on no other workspace package.
    files: ["packages/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(
        {
          regex: "^(next|react|react-dom|@mikro-orm)(/|$)",
          message: "@devmentor/core must not depend on Next.js, React or MikroORM.",
        },
        {
          regex: "^@devmentor/",
          message: "@devmentor/core must not depend on other workspace packages.",
        },
      ),
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next, applied in every package:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
  ]),
]);

export default eslintConfig;
