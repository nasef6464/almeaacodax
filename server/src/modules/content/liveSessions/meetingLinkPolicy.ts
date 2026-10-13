const domains: Record<string, string[]> = { zoom: ['zoom.us'], google_meet: ['meet.google.com'], teams: ['teams.microsoft.com', 'teams.live.com', 'teams.cloud.microsoft'], live_youtube: ['youtube.com', 'youtu.be'] };
export function validateMeetingLink(provider: string, value: string) {
  const url = new URL(value);
  const allowed = domains[provider]?.some(domain => url.hostname === domain || ((provider === 'zoom' || provider === 'live_youtube') && url.hostname.endsWith('.' + domain)));
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed) throw Object.assign(new Error('رابط الاجتماع لا يطابق المزود أو ليس آمنًا'), { statusCode: 400 });
  return url.href;
}
export function validateRecordingLink(provider: string,value: string) {
  const url = new URL(value);
  const recordingDomains: Record<string,string[]> = { zoom:['zoom.us'], google_meet:['drive.google.com','docs.google.com'], teams:['sharepoint.com','onedrive.live.com','1drv.ms'], live_youtube:['youtube.com','youtu.be'] };
  if(url.protocol!=='https:' || url.username || url.password || url.port || !recordingDomains[provider]?.some(domain=>url.hostname===domain || ((provider==='zoom'||provider==='teams'||provider==='live_youtube') && url.hostname.endsWith('.'+domain)))) throw Object.assign(new Error('رابط التسجيل لا يطابق المزود'),{statusCode:400});
  return url.href;
}
