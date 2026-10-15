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
  
  const counts = await db.collection('questions').aggregate([
    { $group: { _id: '$subjectId', count: { $sum: 1 } } }
  ]).toArray();
  
  const subjects = await db.collection('subjects').find({}).toArray();
  const subMap = new Map(subjects.map(s => [String(s._id || s.id), s.name || s.title || s.nameAr || s.code]));
  
  console.log('=== TAHSILI QUESTIONS IN MONGODB ALMEAA ===');
  for (const c of counts) {
    console.log(`Subject: ${c._id} (${subMap.get(String(c._id)) || 'Unknown'}): ${c.count} questions`);
  }
  
  await client.close();
}
run().catch(console.error);
