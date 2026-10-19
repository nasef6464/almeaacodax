export type EvidenceStatus='unmeasured'|'insufficient'|'support'|'developing'|'ready';
export const LEARNING_EVIDENCE_POLICY={minimumAnswers:5,supportBelow:60,readyFrom:80} as const;
export function classifySkillEvidence(questions:number,correct:number):EvidenceStatus{
 if(!Number.isFinite(questions)||questions<=0)return 'unmeasured';
 if(!Number.isFinite(correct)||correct<0||correct>questions||questions<LEARNING_EVIDENCE_POLICY.minimumAnswers)return 'insufficient';
 const accuracy=correct/questions*100;return accuracy<60?'support':accuracy>=80?'ready':'developing';
}
export function classifyStudentEvidence(skills:{status:EvidenceStatus}[]):EvidenceStatus{
 if(!skills.length)return 'unmeasured';if(skills.some(s=>s.status==='support'))return 'support';
 if(skills.some(s=>s.status==='unmeasured'||s.status==='insufficient'))return 'insufficient';
 return skills.every(s=>s.status==='ready')?'ready':'developing';
}
