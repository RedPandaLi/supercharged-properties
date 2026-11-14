import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import './validate-release.mjs';
const { version } = JSON.parse(await readFile('manifest.json', 'utf8'));
const directory = `dist/${version}`;
await mkdir(directory, { recursive: true });
const files = ['main.js', 'manifest.json', 'styles.css', 'LICENSE', 'NOTICE.md'];
for (const name of files) await copyFile(name, `${directory}/${name}`);
await copyFile(`docs/releases/${version}.md`, `${directory}/release-notes.md`);
const sums = [];
for (const name of [...files, 'release-notes.md']) {
  sums.push(`${createHash('sha256').update(await readFile(`${directory}/${name}`)).digest('hex')}  ${name}`);
}
await writeFile(`${directory}/SHA256SUMS`, `${sums.join('\n')}\n`);
console.log(`Prepared release assets in ${directory}. Nothing was uploaded or published.`);
