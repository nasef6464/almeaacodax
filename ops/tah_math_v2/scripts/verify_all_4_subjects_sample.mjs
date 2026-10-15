import fs from 'node:fs';
import dns from 'node:dns';
import { MongoClient } from '../../../server/node_modules/mongodb/lib/index.js';

try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e){}

const envContent = fs.readFileSync('server/.env', 'utf8');
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

async function run() {
  const client = new MongoClient(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('almeaa');
  
  const subjects = [
    { id: 'sub_1777784609152', name: 'الرياضيات' },
    { id: 'sub_1784980706034', name: 'الفيزياء' },
    { id: 'sub_1784980728386', name: 'الكيمياء' },
    { id: 'sub_tah_biology_bio26', name: 'الأحياء' },
  ];
  
  console.log('=== TAHSILI SAMPLE QUESTION CHECKS ===');
  for (const s of subjects) {
    const q = await db.collection('questions').findOne({ subjectId: s.id });
    console.log(`\n[${s.name}] (Subject: ${s.id}):`);
    console.log(`  Code: ${q?.questionCode}`);
    console.log(`  ImageUrl: ${q?.imageUrl}`);
    console.log(`  Options: ${JSON.stringify(q?.options)}`);
    console.log(`  OptionsEmbedded: ${q?.optionsEmbeddedInImage}`);
    console.log(`  KeyIndex: ${q?.correctOptionIndex}`);
  }
  
  await client.close();
}
run().catch(console.error);
