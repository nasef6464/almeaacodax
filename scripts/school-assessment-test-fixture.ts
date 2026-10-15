import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const serverRequire=createRequire(new URL('../server/package.json',import.meta.url));
export const mongoose=serverRequire('mongoose');
export async function isolatedMongo(){
  const configured=process.env.ASSESSMENT_TEST_MONGODB_URI;
  if(!configured)return (await import('./live-session-test-fixture.js')).isolatedMongo();
  const url=new URL(configured);
  if(url.protocol!=='mongodb:'||url.hostname!=='127.0.0.1'||url.username||url.password||url.search)throw Error('Only disposable loopback Mongo service allowed');
  url.pathname='/school_assessment_test_'+randomUUID().replaceAll('-','');
  const uri=url.toString();
  Object.assign(process.env,{NODE_ENV:'test',MONGODB_URI:uri,JWT_SECRET:'isolated-school-assessment-test-secret',DEV_LOCAL_ADMIN_BYPASS:'false'});
  mongoose.set('strictQuery',true);
  await mongoose.connect(uri);
  return async()=>{await mongoose.connection.dropDatabase();await mongoose.disconnect();};
}
