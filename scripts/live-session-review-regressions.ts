import assert from 'node:assert/strict';
function pauseRead(model:any,method:string,id:string) {
  const original=model[method];let release!:()=>void,reached!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const hit=new Promise<void>(resolve=>{reached=resolve;});
  model[method]=function(...args:any[]) {
    const query=original.apply(this,args);
    if(String(args[0]?._id || args[0])===id) {
      const exec=query.exec.bind(query);
      query.exec=async(...params:any[])=>{const result=await exec(...params);model[method]=original;reached();await gate;return result;};
    }
    return query;
  };
  return { hit,release,restore:()=>{model[method]=original;release();} };
}
export async function reviewRegressions({request,users,input,ActivityModel,LiveSessionModel,CourseModel}:any) {
  const [,teacher,studentA]=users;
  const seed=async(title:string)=>ActivityModel.create({userId:String(studentA._id),type:'session_booked',title,date:new Date().toISOString()});
  for(const [i,action] of ['studentCancel','adminReject'].entries()) {
    const booking=await seed(`race ${action}`),id=String(booking._id);
    const pause=pauseRead(ActivityModel,'findOne',id);
    try {
      const mutation=action==='studentCancel'?request(2,`/activities/me/session-bookings/${id}/cancel`,'PATCH'):request(0,`/activities/admin/session-bookings/${id}`,'PATCH',{bookingStatus:'rejected'});
      await pause.hit;
      const confirmation=await request(0,`/live-sessions/bookings/${id}/confirm`,'POST',{...input,meetingDate:new Date(Date.now()+(8+i)*86400000).toISOString()});
      assert.equal(confirmation.status,200,JSON.stringify(confirmation.body));pause.release();
      const outcome=await mutation;assert.ok([200,409].includes(outcome.status));
      const current=await ActivityModel.findById(id),session=await LiveSessionModel.findById(current!.sessionId);
      assert.equal(current!.bookingStatus==='confirmed',session!.state==='confirmed',`${action} must not split booking/session truth`);
    } finally {pause.restore();}
  }
  const booking=await seed('reassignment race'),id=String(booking._id);
  const start={...input,meetingDate:new Date(Date.now()+10*86400000).toISOString()};
  const confirmation=await request(0,`/live-sessions/bookings/${id}/confirm`,'POST',start);assert.equal(confirmation.status,200);
  const sessionId=confirmation.body.session.id;
  const teacher2=await (await import('../server/src/models/User.js')).UserModel.findOne({email:'second-live@isolated.test'});
  const pause=pauseRead(LiveSessionModel,'findById',sessionId);
  try {
    const oldTeacherAction=request(1,`/live-sessions/${sessionId}`,'PATCH',{action:'cancel'});await pause.hit;
    assert.equal((await request(0,`/live-sessions/${sessionId}`,'PATCH',{action:'reschedule',input:{...start,teacherId:String(teacher2!._id)}})).status,200);
    pause.release();assert.equal((await oldTeacherAction).status,403);
    assert.equal((await LiveSessionModel.findById(sessionId))!.state,'confirmed');
    assert.equal((await ActivityModel.findById(id))!.teacherId,String(teacher2!._id));
    assert.equal((await request(1,'/activities/teacher/session-bookings')).body.bookings.some((b:any)=>b.id===id),false);
  } finally {pause.restore();}
  const studentPause=pauseRead(LiveSessionModel,'findById',sessionId);
  try {
    const studentCancel=request(2,`/live-sessions/${sessionId}`,'PATCH',{action:'cancel'});await studentPause.hit;
    assert.equal((await request(0,`/live-sessions/${sessionId}`,'PATCH',{action:'reschedule',input:{...start,teacherId:String(teacher2!._id),meetingDate:new Date(Date.now()-30000).toISOString()}})).status,200);
    studentPause.release();assert.equal((await studentCancel).status,403);
    assert.equal((await LiveSessionModel.findById(sessionId))!.state,'confirmed');
  } finally {studentPause.restore();}
  await CourseModel.updateOne({_id:'live-course-fixture'},{$set:{isPublished:true,modules:[]}});
  assert.equal((await request(2,'/live-sessions/source?courseId=live-course-fixture&lessonId=course-live')).status,404);
  console.log('PASS deterministic cancel/reject vs confirmation, reassigned teacher authority/metadata, and removed course lesson access');
}
