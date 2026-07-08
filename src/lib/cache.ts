import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_DIR = '.cache';

export function writeCache(name: string, data: unknown, dir = DEFAULT_DIR): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(data), 'utf8');
}

export function readCache<T = unknown>(name: string, dir = DEFAULT_DIR): T | null {
  const path = join(dir, `${name}.json`);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')) as T; }
  catch { return null; }
}
