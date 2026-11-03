import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = 'public/assets/native-visuals';
const manifest = JSON.parse(await readFile(`${directory}/manifest.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const [path, expected] of Object.entries(manifest.sourceHashes))
  if (hash(await readFile(path)) !== expected)
    throw new Error(
      `Native art is stale after ${path}. Run npm run build:native-visuals and commit the shared export.`,
    );
for (const [name, asset] of Object.entries(manifest.assets))
  if (hash(await readFile(`${directory}/${name}.png`)) !== asset.sha256)
    throw new Error(
      `Native shared art is missing or altered: ${name}. Run npm run build:native-visuals.`,
    );
process.stdout.write(`Verified ${Object.keys(manifest.assets).length} shared native visuals.\n`);
