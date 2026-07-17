import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Next.js apps use eslint-config-next (which already bundles typescript-eslint)
// instead of the repo's eslint.config.base.mjs - mixing both would register the
// @typescript-eslint plugin twice. Formatting still comes from the root Prettier
// config; eslint-config-prettier keeps the two from fighting.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  // Override default ignores of eslint-config-next.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
