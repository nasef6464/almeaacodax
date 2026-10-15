import {createHash} from 'node:crypto';
import {z} from 'zod';
const ids=(max:number,min=0)=>z.array(z.string().trim().min(1).max(200)).min(min).max(max).transform(values=>[...new Set(values)].sort());
const date=z.string().datetime({offset:true}).transform(value=>new Date(value).toISOString());
const window={opensAt:date,closesAt:date};
const commandId=z.string().uuid().transform(value=>value.toLowerCase());
const schema=z.discriminatedUnion('operation',[
  z.object({commandId,operation:z.literal('retarget'),payload:z.object({targetGroupIds:ids(500).default([]),targetUserIds:ids(500).default([])}).strict()
    .refine(value=>value.targetGroupIds.length+value.targetUserIds.length>0,'اختر الطلاب أو الفصول المستهدفة.')} ).strict(),
  z.object({commandId,operation:z.literal('remind'),payload:z.object({studentIds:ids(500,1).optional()}).strict()}).strict(),
  z.object({commandId,operation:z.literal('reopen'),payload:z.object(window).strict()}).strict(),
  z.object({commandId,operation:z.literal('retake'),payload:z.object({studentIds:ids(100,1),...window}).strict()}).strict(),
]);
export const normalizeSchoolAssessmentCommand=(value:unknown)=>schema.parse(value);
export type SchoolAssessmentCommand=ReturnType<typeof normalizeSchoolAssessmentCommand>;
export type SchoolAssessmentCommandResult={commandId:string;operation:SchoolAssessmentCommand['operation'];targetGroupCount?:number;targetUserCount?:number;notifiedCount?:number;grantedCount?:number;reopened?:boolean};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const schoolCommandIdentity=(actorId:string,quizId:string,command:SchoolAssessmentCommand)=>({
  id:hash([actorId,quizId,command.commandId]),hash:hash([command.operation,command.payload]),
});
