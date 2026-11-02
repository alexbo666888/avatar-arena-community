import {BattleEngine,DEFAULT_SETTINGS} from './battle-engine.mjs';
import {BattleRenderer,avatarFallback} from './battle-renderer.mjs';
import {renderPrintSettings} from './print-settings.mjs';
import {GiftSpeech} from './gift-speech.mjs';
import {BattleStream} from './battle-stream.mjs';
import {GIFT_DEFAULTS,WEAPONS,giftEffect} from './arena-rules.mjs';
const $=id=>document.getElementById(id);
const errors=[];window.addEventListener('error',e=>errors.push(String(e.message)));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
let saved={};try{saved=JSON.parse(localStorage.getItem('arena-community-settings-v1')||'{}')}catch{}
const engine=new BattleEngine(saved);let view;
try{view=new BattleRenderer($('stage'),engine);$('loading').remove()}catch(e){$('loading').textContent='3D 初始化失败：'+e.message+'。请更新显卡驱动或使用 Edge 打开本地地址。';throw e}
const stream=new BattleStream(view,t=>$('stream-status').textContent=t);
let people=Array.from({length:12},(_,i)=>({name:['橘子汽水','蓝莓布丁','小熊软糖','薄荷拿铁','月亮晚安','桃桃乌龙','快乐阿柴','芝士芋泥','柚子茶茶','奶油泡泡','星星同学','椰奶团子'][i]}));
people=people.map(p=>({...p,avatar:avatarFallback(p.name)}));
let personIndex=0,live=false,wanted=false,socket=null,connecting=false,reconnect=null,speed=1,lastDemo=0,lastIdle=0,frames=0,frameStamp=performance.now(),fps=0;
const testMode=new URLSearchParams(location.search).has('test');
let preDisconnectPause=false;
const speech=new GiftSpeech(t=>$('stream-status').textContent=t);speech.enabled=false;
const formatTime=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function save(){try{localStorage.setItem('arena-community-settings-v1',JSON.stringify(engine.settings))}catch{}refreshGiftOptions()}
renderPrintSettings($('rules'),engine.settings,save);
function refreshGiftOptions(){const select=$('demo-gift'),old=select.value;select.replaceChildren();for(const[key,value]of Object.entries(GIFT_DEFAULTS)){const effect=giftEffect({gift:key,raw:value.name}),option=document.createElement('option');option.value=key;option.textContent=`${effect.name} · ${effect.count} 人 · ${WEAPONS[effect.weapon].name}`;select.append(option)}if([...select.options].some(o=>o.value===old))select.value=old}
refreshGiftOptions();
function fillPeople(){$('demo-user').replaceChildren();for(const[p,i]of people.map((p,i)=>[p,i])){const o=document.createElement('option');o.value=i;o.textContent=p.name;$('demo-user').append(o)}}fillPeople();
function log(result,event,demo){
  if(result.ignored||result.duplicate)return;
  const row=document.createElement('li'),img=document.createElement('img'),text=document.createElement('span'),time=document.createElement('span');
  img.src=event.avatar||avatarFallback(result.name);img.onerror=()=>{img.onerror=null;img.src=avatarFallback(result.name)};img.alt='';
  text.className=result.team==='red'?'red-text':'blue-text';
  text.textContent=result.overflow?'队列已满：本次互动未入场':`${result.name} · ${result.team==='red'?'红':'蓝'}队 · ${result.added?`${result.added} 个分身 · ${WEAPONS[result.weapon]?.name||'徒手'}`:'该触发已关闭'}${result.nextTeam?' · 下局换'+(result.nextTeam==='red'?'红':'蓝')+'队':''}${demo?'（模拟）':''}`;
  time.className='time';time.textContent=formatTime(engine.time);row.append(img,text,time);$('feed').prepend(row);while($('feed').children.length>20)$('feed').lastChild.remove();
}
function receive(e,{demo=false,force=false,silent=false}={}){
  if(['hello','room','ping'].includes(e.type)){
    if(e.room&&!$('room').value)$('room').value=e.room;
    if(e.type==='ping'&&e.stats)$('live-status').textContent=`已连接 · 评论 ${e.stats.comment} · 观众 ${e.stats.roster} 人${e.stats.lastAgo==null?' · 等待直播动态':''}`;
    return;
  }
  const result=engine.event(e,{demo,force,unranked:live&&demo});if(!silent)log(result,e,demo);
  if(!silent&&speech.enabled&&!result.duplicate){if(e.type==='gift'&&engine.settings.giftVoice)speech.say(result.name,e.raw||({heart:'爱心',beer:'啤酒',lollipop:'棒棒糖'}[e.gift]||'礼物'),Math.max(1,Number(e.count)||1));if(e.type==='join'&&engine.settings.joinVoice)speech.welcome(result.name)}
  return result;
}
function reinforce(){for(let i=0;i<16;i++){const p=people[personIndex++%people.length];receive({...p,type:'comment',text:i%2?'蓝':'红'},{demo:true,force:true,silent:i>1})}}
function setLive(value){if(live!==value){engine.reset();$('feed').replaceChildren();$('pause').textContent='暂停对战';lastDemo=lastIdle=0;}live=value;view.live=value;$('mode').textContent=value?'直播互动':'本地演示';$('status-dot').classList.toggle('live',value);$('reinforce').disabled=value;$('reset').disabled=value;$('speed').disabled=value;if(value){speed=1;$('speed').value='1';engine.clearDemo()}}
function validRoom(){const raw=$('room').value.trim();if(!/^(?:https?:\/\/live\.douyin\.com\/)?\d{5,25}(?:[/?#].*)?$/.test(raw))throw Error('请输入直播间数字房间号或 live.douyin.com 完整链接，不能填个人抖音号。');return raw}
function roomDigits(raw){return raw.match(/(?:live\.douyin\.com\/)?(\d{5,25})/)[1]}
async function action(button,work){button.disabled=true;try{const result=await work();if(result)$('live-status').textContent=result}catch(e){$('live-status').textContent=e.message||String(e)}finally{button.disabled=false}}
async function bridgeConnect(){
  if(!wanted||connecting||socket?.readyState===0||socket?.readyState===1)return;
  connecting=true;
  try{const status=await(await fetch('/__bridge-status',{signal:AbortSignal.timeout(4500)})).json();if(!status.ok)throw Error('尚未检测到数据桥，请先打开直播间并完成登录。');
    socket=new WebSocket(status.url);
    socket.onopen=()=>{connecting=false;if(live)engine.paused=preDisconnectPause;setLive(true);$('live-status').textContent='数据桥已连接，等待真实互动。'};
    socket.onmessage=e=>{try{receive(JSON.parse(e.data))}catch(err){$('live-status').textContent='互动数据处理失败：'+err.message}};
    socket.onerror=()=>{};
    socket.onclose=()=>{connecting=false;if(wanted){preDisconnectPause=engine.paused;engine.paused=true;$('live-status').textContent='数据桥已断开，战局已暂停保留，正在重连。';reconnect=setTimeout(bridgeConnect,3000)}else setLive(false)};
  }catch(e){connecting=false;$('live-status').textContent=e.message;if(wanted)reconnect=setTimeout(bridgeConnect,3000)}
}
$('open-room').onclick=()=>action($('open-room'),async()=>{const raw=validRoom();if(window.pywebview?.api)return await window.pywebview.api.open_live_room(raw);const j=await(await fetch('/__open-live?debug=1&room='+roomDigits(raw))).json();if(!j.ok)throw Error(j.error||'直播间打开失败');return '直播间已打开，请自行登录后点击开始抓取。'});
$('capture').onclick=()=>action($('capture'),async()=>{const raw=validRoom();let text;if(window.pywebview?.api)text=await window.pywebview.api.start_capture(raw);else{const j=await(await fetch('/__start-bridge?room='+roomDigits(raw))).json();if(!j.ok)throw Error(j.error||'数据桥启动失败');text='正在连接直播数据桥…'}wanted=true;await bridgeConnect();return text});
$('disconnect').onclick=()=>action($('disconnect'),async()=>{wanted=false;clearTimeout(reconnect);socket?.close();socket=null;setLive(false);if(window.pywebview?.api)await window.pywebview.api.stop_capture();else await fetch('/__stop-bridge');return '抓取已停止，已切回本地演示。'});
$('pause').onclick=()=>{engine.paused=!engine.paused;$('pause').textContent=engine.paused?'继续对战':'暂停对战'};
$('reinforce').onclick=reinforce;
$('reset').onclick=()=>{engine.reset();lastDemo=lastIdle=0;$('feed').replaceChildren();$('pause').textContent='暂停对战';if(!live)reinforce()};
$('camera-reset').onclick=()=>{view.resetCamera();stream.camera()};
$('orientation').onchange=()=>{view.resize($('orientation').value);stream.size();stream.camera()};
$('quality').onchange=()=>view.quality($('quality').value);
$('sound').onchange=()=>{speech.enabled=$('sound').checked;if(speech.enabled){speech.unlocked=true;speech.enqueue('红蓝对战已经准备好，评论红或蓝，加入你的阵营。')}else speech.stop()};
$('output').onclick=async()=>{try{if(window.pywebview?.api){$('stream-status').textContent=await window.pywebview.api.open_scene_window(null,$('orientation').value)}else{const popup=window.open('/live-view.html','battle-output','width=1100,height=760');if(!popup)throw Error('弹窗被拦截，请允许本地页面打开弹窗。')}}catch(e){$('stream-status').textContent=e.message}};
for(const tab of document.querySelectorAll('[role=tab]'))tab.onclick=()=>{for(const t of document.querySelectorAll('[role=tab]')){const selected=t===tab;t.setAttribute('aria-selected',String(selected));$(t.getAttribute('aria-controls')).hidden=!selected}};
$('help').onclick=()=>$('help-dialog').showModal();$('close-help').onclick=()=>$('help-dialog').close();
function demoEvent(type,extra={}){if(live){$('live-status').textContent='请先停止抓取，再运行模拟事件，避免混入真实观众。';return}receive({...people[Number($('demo-user').value)||0],type,...extra},{demo:true})}
$('send-comment').onclick=()=>demoEvent('comment',{text:$('demo-text').value});$('send-like').onclick=()=>demoEvent('like',{count:1});$('send-gift').onclick=()=>{const key=$('demo-gift').value;demoEvent('gift',{gift:key,raw:GIFT_DEFAULTS[key]?.name,count:Math.min(100,Math.max(1,Math.floor(Number($('gift-amount').value)||1)))})};$('send-join').onclick=()=>demoEvent('join');$('send-follow').onclick=()=>demoEvent('follow');
$('speed').onchange=()=>speed=Number($('speed').value);
$('avatar-files').onchange=async()=>{const files=[...$('avatar-files').files].filter(f=>f.type.startsWith('image/')).slice(0,100);if(!files.length)return;const loaded=[];for(const f of files){if(f.size>10*1024*1024)continue;try{const bitmap=await createImageBitmap(f);const c=document.createElement('canvas');c.width=c.height=128;const side=Math.min(bitmap.width,bitmap.height);c.getContext('2d').drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,128,128);bitmap.close();loaded.push({name:f.name.replace(/\.[^.]+$/,'').slice(0,24),avatar:c.toDataURL('image/png')})}catch{}}if(loaded.length){people=loaded;fillPeople();$('avatar-status').textContent=`已导入 ${loaded.length} 张头像，新生成的小人使用这些头像。`}else $('avatar-status').textContent='没有可读取的图片，请使用不超过 10 MB 的 PNG/JPG。'};
async function loadAvatars(){try{const entries=await(await fetch('./assets/generated/avatar-names.json')).json();const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src='./assets/generated/avatar-atlas.png'});people=entries.map(e=>{const c=document.createElement('canvas');c.width=c.height=128;const w=img.width/4,h=img.height/3;c.getContext('2d').drawImage(img,e.column*w+2,e.row*h+2,w-4,h-4,0,0,128,128);return {name:e.name,avatar:c.toDataURL('image/png')}});fillPeople();$('avatar-status').textContent='已载入 12 张虚构观众头像，可替换为你自己的图片。'}catch{$('avatar-status').textContent='使用昵称首字演示头像。'}reinforce()}
await loadAvatars();
for(let i=0;i<4;i++)receive({...people[i],type:'gift',gift:i%2?'lollipop':'beer'},{demo:true,force:true,silent:true});
let previous=performance.now(),uiClock=0;
function frame(now){requestAnimationFrame(frame);if(now-previous<1000/30-.5)return;const elapsed=Math.min(.2,(now-previous)/1000);previous=now;let remain=elapsed*(live?1:speed);while(remain>0){const step=Math.min(.05,remain);engine.step(step);remain-=step}view.draw();stream.frame();frames++;if(now-frameStamp>2000){fps=frames*1000/(now-frameStamp);frames=0;frameStamp=now}
  if(now-uiClock>250){uiClock=now;const s=engine.summary();$('elapsed').textContent=s.phase==='result'?`下局 ${Math.ceil(s.intermission)}s`:`第${s.round}局 ${formatTime(Math.ceil(s.remaining))}`;$('queue-count').textContent=`待入场 ${s.queued}`;$('stat-comment').textContent=s.stats.comment;$('stat-like').textContent=s.stats.like;$('stat-gift').textContent=s.stats.gift;if(s.dropped)$('capacity').textContent=`队列达到上限，已有 ${s.dropped} 次互动未入队。请降低每次出兵数量。`;
    const gap=Number(engine.settings.demoGapMs)/1000;if(!live&&gap>0&&engine.time-lastDemo>=gap&&engine.queue.length<2){lastDemo=engine.time;receive({...people[personIndex++%people.length],type:'comment'},{demo:true,force:true})}
    if(live&&engine.settings.idleFill&&engine.time-engine.lastActivity>=engine.settings.idleSeconds&&engine.time-lastIdle>=engine.settings.idleSeconds&&engine.queue.length<2){lastIdle=engine.time;receive({...people[personIndex++%people.length],type:'comment'},{demo:true,force:true})}
  }
}requestAnimationFrame(frame);
if(testMode)window.battleTest={event:(e,opts)=>receive(e,opts),reset:()=>engine.reset(),step:(seconds)=>{for(let t=0;t<seconds;t+=.05)engine.step(.05);view.draw()},screenshot:()=>view.screenshot(),diagnostics:()=>({...engine.summary(),fps,errors:[...errors],output:[view.canvas.width,view.canvas.height],heads:view.nodes.size,units:engine.units.map(u=>({name:u.name,team:u.team,hp:u.hp,x:u.x,size:u.size,weapon:u.weapon})),connected:stream.pc?.connectionState||'none'}),setRules:settings=>Object.assign(engine.settings,settings)};
window.addEventListener('pagehide',()=>{speech.stop();socket?.close();stream.close()});
