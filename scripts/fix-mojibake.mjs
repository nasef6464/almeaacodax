import { readFile, writeFile } from 'node:fs/promises';

const filePath = 'dashboards/admin/AdminDashboard.tsx';
let content = await readFile(filePath, 'utf8');

// Function to decode latin1 double-encoded utf8 string
function decodeMojibake(text) {
  try {
    const bytes = Buffer.from(text, 'binary');
    const decoded = bytes.toString('utf8');
    if (!decoded.includes('')) {
      return decoded;
    }
  } catch (e) {
    // fallback
  }
  return text;
}

// Regex to match sequences of Mojibake chars starting with Ø or Ù
const repaired = content.replace(/(?:[ØÙ][\x80-\xBF\xA0-\xFF\x20-\x7E]{1,80})+/g, (match) => {
  if (match.includes('Ø') || match.includes('Ù')) {
    const fixed = decodeMojibake(match);
    return fixed !== match ? fixed : match;
  }
  return match;
});

await writeFile(filePath, repaired, 'utf8');
console.log('AdminDashboard.tsx encoding repaired successfully.');
