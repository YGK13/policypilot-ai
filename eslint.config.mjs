// ESLint flat config (Next 16 removed `next lint`; run `npm run lint` = `eslint .`).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "public/**"],
  },
];

export default eslintConfig;
