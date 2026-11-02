import {startWSServer} from './bridge-ws.mjs';
import http from 'node:http';
import assert from 'node:assert/strict';
// Windows 动态端口附近可能是系统排除范围；明确验证相邻备用端口可绑定。
let occupied,port;
for(const candidate of [19040,19140,19240,19340]){
  const a=http.createServer(),b=http.createServer();
  try{
    await new Promise((r,j)=>{a.once('error',j);a.listen(candidate,'127.0.0.1',r)});
    await new Promise((r,j)=>{b.once('error',j);b.listen(candidate+1,'127.0.0.1',r)});
    await new Promise(r=>b.close(r));occupied=a;port=candidate;break;
  }catch{a.close();b.close()}
}
assert.ok(occupied,'测试需要一对可用的本机端口');
let hub;const actual=await new Promise((resolve,reject)=>{hub=startWSServer(port,{fallbackPorts:9,identity:'test',onStatus:resolve,onError:reject})});
assert(actual>port);const h=await(await fetch(`http://127.0.0.1:${actual}/health`)).json();assert.equal(h.identity,'test');
const ws=new WebSocket(`ws://127.0.0.1:${actual}`);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});const received=new Promise(r=>ws.onmessage=e=>r(e.data));hub.broadcast({test:true});assert.equal(await received,'{"test":true}');await new Promise(r=>{ws.onclose=r;ws.close()});hub.close();occupied.close();console.log('PASS occupied port fallback, health identity, websocket delivery');
