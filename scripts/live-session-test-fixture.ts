import { createRequire } from 'node:module';
const rootRequire = createRequire(new URL('../package.json', import.meta.url));
const serverRequire = createRequire(new URL('../server/package.json', import.meta.url));
export const mongoose = serverRequire('mongoose');
export async function isolatedMongo() {
  const { MongoMemoryReplSet } = rootRequire('mongodb-memory-server-core');
  const repl = await MongoMemoryReplSet.create({ binary: { version: '7.0.14', downloadDir: 'scratch/live-mongo-binaries' }, replSet: { count: 1 }, instanceOpts: [{ launchTimeout: 90000 }] });
  const uri = repl.getUri('live_session_isolated');
  if (!/^mongodb:\/\/127\.0\.0\.1:/.test(uri)) throw new Error('Non-isolated test database refused');
  process.env.NODE_ENV = 'test'; process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'isolated-live-sessions-test-only-secret';
  process.env.DEV_LOCAL_ADMIN_BYPASS = 'false';
  mongoose.set('strictQuery',true);
  await mongoose.connect(uri);
  return async () => { await mongoose.disconnect(); await repl.stop({ doCleanup: false }); };
}
