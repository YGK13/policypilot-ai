import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// Flat config for ESLint 9 + Next 16 (`next lint` was removed in Next 16;
// `npm run lint` now runs `eslint .` directly).
const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
  {
    // The authenticated app predates the React-Compiler-era rules shipped in
    // eslint-plugin-react-hooks v7. Its effect-driven data loading and ref
    // initialisers are conventional React 19 without the compiler; migrating
    // them is tracked as tech debt (TECH_DEBT_AUDIT_2026_07.md). Keep them
    // visible as warnings rather than blocking the build. New code under
    // app/(marketing) and components/ is held to the full rule set.
    files: ["app/(app)/**/*.{js,jsx}", "app/AppShell.jsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
