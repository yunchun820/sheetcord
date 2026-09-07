import { mkdir, access, readdir, readFile, writeFile } from 'node:fs/promises';
import { zipSync, unzipSync } from 'fflate';
await access('dist/manifest.json');
await mkdir('artifacts', { recursive: true });
const entries = {};
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) await collect(`${directory}/${entry.name}`, `${relative}/`);
    else if (entry.isFile()) entries[relative] = new Uint8Array(await readFile(`${directory}/${entry.name}`));
  }
}
await collect('dist');
const zip = zipSync(entries, { level: 9 });
const unpacked = unzipSync(zip);
for (const [name, bytes] of Object.entries(entries)) {
  if (!Buffer.from(bytes).equals(Buffer.from(unpacked[name]))) throw new Error(`Archive validation failed: ${name}`);
}
await writeFile('artifacts/sheetcord-0.1.0.zip', zip);
console.log(`artifacts/sheetcord-0.1.0.zip — ${Object.keys(entries).length} files, ${zip.length} bytes (verified)`);
