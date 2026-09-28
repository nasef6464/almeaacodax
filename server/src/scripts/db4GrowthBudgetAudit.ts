import mongoose from "mongoose";
import { env } from "../config/env.js";
import { DB_GROWTH_BUDGETS } from "../modules/database/dbGrowthBudgets.js";
async function groupMax(collection:string, fields:Record<string,unknown>) {
  const db=mongoose.connection.db;if(!db)throw new Error("MongoDB connection has no database handle");
  const maxes=Object.fromEntries(Object.keys(fields).map((key)=>[`max_${key}`,{$max:`$${key}`}]));
  return (await db.collection(collection).aggregate([{$project:fields},{$group:{_id:null,...maxes}}],{allowDiskUse:false}).toArray())[0]||{};
}
async function run(){
 await mongoose.connect(env.MONGODB_URI,{serverSelectionTimeoutMS:12_000});
 try{
  const observed={
   users:await groupMax("users",{completedLessons:{$size:{$ifNull:["$completedLessons",[]]}},interactiveVideoProgress:{$size:{$ifNull:["$interactiveVideoProgress",[]]}},bytes:{$bsonSize:"$$ROOT"}}),
   lessonProgress:await groupMax("lessonprogresses",{answeredQuestionIds:{$size:{$ifNull:["$answeredQuestionIds",[]]}},bytes:{$bsonSize:"$$ROOT"}}),
   classroom:await groupMax("classroomsessions",{questionSnapshots:{$size:{$ifNull:["$questionSnapshots",[]]}},questionBatches:{$size:{$ifNull:["$questionBatches",[]]}},bytes:{$bsonSize:"$$ROOT"}}),
   courses:await groupMax("courses",{bytes:{$bsonSize:"$$ROOT"},mediaChars:{$strLenBytes:{$ifNull:["$thumbnail",""]}}}),
   ads:await groupMax("announcementads",{bytes:{$bsonSize:"$$ROOT"},mediaChars:{$strLenBytes:{$ifNull:["$imageUrl",""]}}}),
  };
  console.log(JSON.stringify({readOnly:true,budgets:DB_GROWTH_BUDGETS,observed},null,2));
 }finally{await mongoose.disconnect();}
}
run().catch(async(error)=>{console.error("DB-4 growth budget audit failed");console.error(error);await mongoose.disconnect().catch(()=>undefined);process.exitCode=1;});
