import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const restrict = (...patterns) => ["error", { patterns }];

const noWorkspaceImports = (pkg, allowed = []) => ({
  regex: allowed.length ? `^@devmentor/(?!(${allowed.join("|")})(/|$))` : "^@devmentor/",
  message: `@devmentor/${pkg} must not import ${allowed.length ? `workspace packages other than @devmentor/${allowed.join(", @devmentor/")}` : "other workspace packages"} (dependency direction: app → core → db, ui standalone).`,
});

const noMikroOrm = (pkg) => ({
  regex: "^@mikro-orm/",
  message: `Only @devmentor/db may import @mikro-orm/*; @devmentor/${pkg} uses the types re-exported by @devmentor/db.`,
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "packages/app/" },
    },
  },
  {
    files: ["packages/**/*.{ts,tsx,mjs}"],
    rules: {
      // Packages import each other by name (@devmentor/<pkg>), never by relative path.
      "import/no-relative-packages": "error",
      // Engineering standards: no `any`, no stray console output (use the shared logger), no swallowed errors.
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },
  {
    files: ["packages/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(
        {
          regex: "^@devmentor/db(/|$)",
          message: "@devmentor/app must not import @devmentor/db; go through services in @devmentor/core (app → core → db).",
        },
        noMikroOrm("app"),
      ),
    },
  },
  {
    // core holds business rules: framework-agnostic, persistence only through @devmentor/db.
    files: ["packages/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(
        {
          regex: "^(next|react|react-dom)(/|$)",
          message: "@devmentor/core must not depend on Next.js or React.",
        },
        noMikroOrm("core"),
        noWorkspaceImports("core", ["db"]),
      ),
    },
  },
  {
    files: ["packages/db/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(noWorkspaceImports("db")),
    },
  },
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(noWorkspaceImports("ui"), noMikroOrm("ui")),
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
