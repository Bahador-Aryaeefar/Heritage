import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Walk up from `startDir` until `pnpm-workspace.yaml` is found (monorepo root). */
export function findMonorepoRoot(startDir: string = process.cwd()): string {
  let dir = resolve(startDir);
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return startDir;
    }
    dir = parent;
  }
}

/** Load `{monorepoRoot}/.env` without overriding variables already set in the process. */
export function loadRootEnv(startDir?: string): string | null {
  const envPath = resolve(findMonorepoRoot(startDir), '.env');
  if (!existsSync(envPath)) {
    return null;
  }
  config({ path: envPath, override: false });
  return envPath;
}

export function rootEnvFilePath(startDir?: string): string {
  return resolve(findMonorepoRoot(startDir), '.env');
}
