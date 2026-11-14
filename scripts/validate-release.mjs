import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const manifest = await json('manifest.json');
const pkg = await json('package.json');
const lock = await json('package-lock.json');
const versions = await json('versions.json');
assert.match(manifest.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
assert(!manifest.id.includes('obsidian'), 'Plugin ID must not contain obsidian');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.match(manifest.minAppVersion, /^\d+\.\d+\.\d+$/);
assert.equal(pkg.version, manifest.version, 'Package and manifest versions differ');
assert.equal(lock.version, manifest.version, 'Lockfile version differs');
assert.equal(lock.packages[''].version, manifest.version);
assert.equal(versions[manifest.version], manifest.minAppVersion);
assert.equal(typeof manifest.isDesktopOnly, 'boolean');
assert.equal(manifest.author, 'Ajay Zapadiya');
assert(manifest.description.length <= 250 && manifest.description.endsWith('.'));
assert.equal(pkg.license, 'MIT');
assert.equal(lock.packages[''].license, pkg.license, 'Lockfile license differs');
const license = await readFile('LICENSE', 'utf8');
assert.match(license, /^MIT License/);
assert.match(license, /Permission is hereby granted, free of charge/);
const notice = await readFile('NOTICE.md', 'utf8');
assert.match(notice, /SPDX-License-Identifier: `MIT`/);
if (process.env.RELEASE_TAG) assert.equal(process.env.RELEASE_TAG, manifest.version, 'Release tag must equal manifest.version, without v prefix');
for (const file of ['main.js', 'styles.css', 'LICENSE', 'NOTICE.md', 'README.md', `docs/releases/${manifest.version}.md`]) {
  assert((await readFile(file)).length > 0, `${file} is missing or empty`);
}
const source = await readFile('main.js', 'utf8');
assert(!/\/Users\/|\/home\/runner\//.test(source), 'Build contains machine-specific paths');
// Inspect the full module graph: the production bundle must only import the host Obsidian module.
const result = await build({ entryPoints: ['src/main.ts'], bundle: true, external: ['obsidian'], format: 'cjs', target: 'es2020', write: false, metafile: true });
for (const output of Object.values(result.metafile.outputs)) {
  for (const dependency of output.imports) assert.equal(dependency.path, 'obsidian', 'Unexpected runtime dependency');
}
console.log(`Validated ${manifest.id} ${manifest.version}: manifest, versions, assets, and runtime module graph.`);

// Check local Markdown links recursively so documentation changes cannot introduce dead links.
async function checkDocumentation(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) { await checkDocumentation(path); continue; }
    if (!entry.name.endsWith('.md')) continue;
    const text = await readFile(path, 'utf8');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const href = match[1].split('#')[0];
      if (!href || /^[a-z]+:/i.test(href)) continue;
      await access(resolve(dirname(path), decodeURIComponent(href)));
    }
  }
}
await checkDocumentation('.');
console.log('Validated local Markdown links.');
