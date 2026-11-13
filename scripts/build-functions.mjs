import { build } from 'esbuild';

await build({
  entryPoints: ['server/functions.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'functions/lib/index.js',
  external: ['firebase-functions', 'firebase-admin'],
  sourcemap: true,
  legalComments: 'none',
  logLevel: 'info',
});
