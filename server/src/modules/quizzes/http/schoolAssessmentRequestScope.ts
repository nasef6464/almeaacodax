import {z} from 'zod';

/** A requested school selects a context; it never grants membership or a role. */
export const schoolAssessmentRequestScope=(query:Record<string,unknown>)=>({
  schoolId:z.string().trim().min(1).max(128).optional().parse(query.schoolId),
});
