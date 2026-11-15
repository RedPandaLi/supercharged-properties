import { mkdir, copyFile, readFile, rm } from 'node:fs/promises';
import './validate-release.mjs';
const { version } = JSON.parse(await readFile('manifest.json', 'utf8'));
const directory = `dist/${version}`;
// Recreate this version's staging directory so old unsupported assets cannot leak into a release.
await rm(directory, { recursive: true, force: true });
await mkdir(directory, { recursive: true });
for (const name of ['main.js', 'manifest.json', 'styles.css']) {
  await copyFile(name, `${directory}/${name}`);
}
console.log(`Prepared the three Obsidian release assets in ${directory}. Nothing was uploaded or published.`);
