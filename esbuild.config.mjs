import { build } from 'esbuild';
await build({ entryPoints: ['src/main.ts'], bundle: true, external: ['obsidian'],
  format: 'cjs', target: 'es2020', outfile: 'main.js',
  banner: { js: '/* Scoped Properties (fork of Supercharged Properties) — MIT. See LICENSE and NOTICE.md. */' } });
