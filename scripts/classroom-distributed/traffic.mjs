export const safePath=value=>new URL(value).pathname.replace(/[a-f\d]{24}/g,':id');
export class TrafficLedger {
 pending=new Map();completed=[];
 start(id,row){this.pending.set(id,{...row,receivedBytes:0,streamEncodedBytes:0,streamDecodedBytes:0,status:0});}
 data(id,encoded,decoded){const row=this.pending.get(id);if(row){row.streamEncodedBytes+=encoded;row.streamDecodedBytes+=decoded;}}
 finish(id,bytes,failed=false){const row=this.pending.get(id);if(row){row.receivedBytes=bytes;row.failed=failed;this.completed.push(row);this.pending.delete(id);}}
 snapshot(){return {completed:this.completed,pending:[...this.pending.values()]};}
}
export async function instrument(page,actor,phase,errors) {
 const ledger=new TrafficLedger();const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');
 const sockets={receivedBytes:0,sentBytes:0,frames:0};
 cdp.on('Network.requestWillBeSent',event=>{
  const url=new URL(event.request.url);if(!/^https?:$/.test(url.protocol))return;
  const kind=url.hostname==='almeaacodax.vercel.app'?(url.pathname.startsWith('/socket.io')?'transport':url.pathname.startsWith('/api/')?'api':'frontend'):url.hostname.endsWith('.r2.dev')?'questionImages':'other';
  ledger.start(event.requestId,{actor,phase:phase(),kind,path:safePath(url.href),method:event.request.method,handshake:kind==='transport'&&event.request.method==='GET'&&!url.searchParams.has('sid'),uploadBodyBytes:Buffer.byteLength(event.request.postData||'')});
 });
 cdp.on('Network.responseReceived',event=>{const row=ledger.pending.get(event.requestId);if(row){row.status=event.response.status;row.cache=Boolean(event.response.fromDiskCache||event.response.fromServiceWorker);row.protocol=event.response.protocol;}});
 cdp.on('Network.dataReceived',event=>ledger.data(event.requestId,event.encodedDataLength,event.dataLength));
 cdp.on('Network.loadingFinished',event=>ledger.finish(event.requestId,event.encodedDataLength));
 cdp.on('Network.loadingFailed',event=>ledger.finish(event.requestId,0,true));
 for(const [name,field] of [['Network.webSocketFrameReceived','receivedBytes'],['Network.webSocketFrameSent','sentBytes']])cdp.on(name,event=>{sockets[field]+=Buffer.byteLength(event.response.payloadData||'');sockets.frames++;});
 page.on('pageerror',()=>errors.push({actor,type:'javascript'}));page.on('console',message=>{if(message.type()==='error')errors.push({actor,type:'console'});});
 return {ledger,sockets};
}
