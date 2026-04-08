#!/usr/bin/env node
/**
 * Generate TypeScript types from the OpenAPI spec.
 *
 * Usage: node scripts/generate-types.mjs
 *
 * Prerequisites: npm install -D openapi-typescript
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const specPath = resolve(root, 'openapi.json');
const outPath = resolve(root, 'src/api/generated/schema.d.ts');

if (!existsSync(specPath)) {
  console.error('❌ openapi.json not found at', specPath);
  process.exit(1);
}

console.log('🔧 Generating TypeScript types from OpenAPI spec...');

try {
  execSync(`npx openapi-typescript "${specPath}" -o "${outPath}"`, {
    cwd: root,
    stdio: 'inherit',
  });
  console.log('✅ Types generated at', outPath);
} catch (err) {
  console.error('❌ Generation failed');
  process.exit(1);
}
