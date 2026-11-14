import { build } from 'esbuild';
await build({ entryPoints: ['src/main.ts'], bundle: true, external: ['obsidian'],
  format: 'cjs', target: 'es2020', outfile: 'main.js',
  banner: { js: '/* Supercharged Properties — MIT. See LICENSE and NOTICE.md. */' } });
