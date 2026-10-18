import {Schema} from 'mongoose';
import {validateTeachingRegions} from '../modules/ai/contracts/verifiedTeachingRegions.js';
const area=new Schema({id:String,label:{type:String,default:''},x:Number,y:Number,width:Number,height:Number},{_id:false,strict:'throw'});
export const questionTeachingRegionsSchema=new Schema({sourceKey:{type:String,default:''},approved:{type:Boolean,default:false},items:{type:[area],default:[]}},{_id:false,strict:'throw'});
export const validStoredTeachingRegions=(value:any)=>value==null||!!validateTeachingRegions(typeof value.toObject==='function'?value.toObject():value);
