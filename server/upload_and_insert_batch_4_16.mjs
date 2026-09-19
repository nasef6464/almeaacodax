import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
dotenv.config({ path: './server/.env' });
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MongoClient } from 'mongodb';

const questions_data = JSON.parse(fs.readFileSync('./scratch/batch_4_16_details.json', 'utf8'));

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const bucket = process.env.R2_BUCKET_NAME || 'almeaa-media';
const publicBase = process.env.R2_PUBLIC_URL || 'https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev';

async function uploadWithRetry(s3Client, command, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await s3Client.send(command);
    } catch (err) {
      console.warn(`[Upload Attempt ${attempt} failed]: ${err.message}`);
      if (attempt === maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function run() {
  console.log(`Starting Batch 4.16 ingestion: ${questions_data.length} questions (Pages 141 to 145: Solids, Cylinders, Spheres, Coordinate Geometry - FINAL BATCH OF THE BOOK!)...`);

  // 1. Upload images to Cloudflare R2
  for (const q of questions_data) {
    const fileBuffer = fs.readFileSync(q.file);
    const key = `questions/taasis/p${q.page}_q_${q.qNum}.webp`;

    await uploadWithRetry(s3, new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: 'image/webp',
    }));

    q.imageUrl = `${publicBase}/${key}`;
    console.log(`✓ Uploaded ${key} to R2 (${fileBuffer.length} bytes) -> ${q.imageUrl}`);
  }

  // 2. Upsert into MongoDB Atlas via Direct Replica Set Connection
  const mongoUri = process.env.MONGODB_DIRECT_URI || 'mongodb://nasef64:Nn0508438250@ac-5fh0moi-shard-00-00.5y2fzx5.mongodb.net:27017,ac-5fh0moi-shard-00-01.5y2fzx5.mongodb.net:27017,ac-5fh0moi-shard-00-02.5y2fzx5.mongodb.net:27017/almeaa?ssl=true&replicaSet=atlas-915t4d-shard-0&authSource=admin&retryWrites=true&w=majority';
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('almeaa');
  const questionsColl = db.collection('questions');

  for (const q of questions_data) {
    const doc = {
      id: q.id,
      type: 'mcq',
      text: '', // Pure visual card display
      imageUrl: q.imageUrl,
      options: ['أ', 'ب', 'ج', 'د'],
      correctOptionIndex: q.correctOptionIndex,
      description: q.description,
      explanation: q.explanation,
      hint: q.hint,
      solvingStrategy: q.solvingStrategy,
      tags: q.tags,
      difficulty: q.difficulty,
      sectionId: q.sectionId,
      skillIds: q.skillIds,
      subject: 'sub_1777779748206',
      pathId: 'p_1777779639431',
      examType: 'qudurat',
      ownerType: 'platform',
      ownerId: '',
      assignedTeacherId: '',
      createdBy: '',
      approvedBy: '',
      approvedAt: null,
      approvalStatus: 'approved',
      reviewerNotes: '',
      revenueSharePercentage: null,
      videoUrl: '',
      year: 2026,
      source: 'imported_taasis_2026',
      updatedAt: new Date(),
    };

    await questionsColl.updateOne(
      { id: q.id },
      { $set: doc, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    console.log(`✓ Upserted ${q.id} (Section: ${q.sectionId}, Skill: ${q.skillIds[0]}) into MongoDB Atlas.`);
  }

  const countTaasis = await questionsColl.countDocuments({ source: 'imported_taasis_2026' });
  const totalQuestions = await questionsColl.countDocuments({});
  console.log(`\n========================================`);
  console.log(`🎉 Batch 4.16 Ingestion Complete!`);
  console.log(`Total live taasis questions in Atlas: ${countTaasis}`);
  console.log(`Total questions in Atlas bank: ${totalQuestions}`);
  console.log(`========================================\n`);

  await client.close();
}

run().catch((err) => {
  console.error('Fatal Error during Batch 4.16 ingestion:', err);
  process.exit(1);
});
