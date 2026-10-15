import mongoose,{Schema} from 'mongoose';
const schema=new Schema({
  _id:{type:String,required:true},
  actorId:{type:String,required:true},quizId:{type:String,required:true},commandId:{type:String,required:true},
  requestHash:{type:String,required:true},
  operation:{type:String,enum:['retarget','remind','reopen','retake'],required:true},
  result:{type:Schema.Types.Mixed,required:true},
},{timestamps:true,versionKey:false});
// The deterministic built-in _id uniquely binds actor + quiz + command.
// Receipts have no TTL: a later submission must never make a replay grant again.
export const SchoolAssessmentCommandModel=mongoose.model('SchoolAssessmentCommand',schema);
