import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function getAllCodeFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        files.push(...(await getAllCodeFiles(fullPath)));
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }
  return files;
}

const rootFiles = await getAllCodeFiles('c:/ALMEAA MAY - codax');
const corrupted = [];

for (const file of rootFiles) {
  if (file.includes('fix-mojibake') || file.includes('smoke-arabic-mojibake-guard')) continue;
  const content = await readFile(file, 'utf8');
  // Check for Mojibake utf8 sequences (e.g. ØªØ·ÙˆÙŠØ±)
  if (content.includes('Ø§Ù„') || content.includes('Ù†Ø®Ø±Ø©')) {
    corrupted.push(file);
  }
}

console.log(JSON.stringify({ totalChecked: rootFiles.length, corruptedCount: corrupted.length, corruptedFiles: corrupted }, null, 2));

if (corrupted.length > 0) {
  process.exit(1);
}
