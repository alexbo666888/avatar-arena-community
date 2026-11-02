import {DemoRules} from './demo-rules.mjs';
import {PRINT_DEFAULTS,printOptions} from './print-settings.mjs';
import {WEAPONS,giftEffect} from './arena-rules.mjs';
export const DEFAULT_SETTINGS={...PRINT_DEFAULTS,comment:true,like:false,join:false,follow:false,gift:true,giftVoice:true,joinVoice:true,idleFill:false,giftSize:'small',roundSeconds:90};
export function chosenTeam(text){const m=String(text||'').trim().match(/^(?:加入|我要加入|我选|选|支持)?\s*(红|蓝)(?:队|方|色|阵营)?[！!。.\s]*$/);return m?(m[1]==='红'?'red':'blue'):null}
export class BattleEngine {
  constructor(settings={},random=Math.random){this.settings={...DEFAULT_SETTINGS,...settings};this.random=random;this.reset()}
  reset(){
    this.rules=new DemoRules();this.units=[];this.teams=new Map();this.nextTeams=new Map();this.roundTeams=new Map();this.seen=new Set();
    this.score={red:0,blue:0};this.total={red:0,blue:0};this.stats={comment:0,like:0,gift:0};
    this.time=0;this.spawnClock=0;this.serial=this.serial||0;this.paused=false;this.hits=[];this.lastActivity=0;this.autoSide='red';this.dropped=0;
    this.round=1;this.remaining=90;this.phase='fighting';this.intermission=0;this.lastResult=null;this.participants=new Map();this.killFeed=[];
  }
  get queue(){return this.rules.queue}
  population(team){return this.units.filter(u=>u.team===team&&u.hp>0).length+this.queue.filter(u=>u.team===team).length}
  assign(key,explicit){
    if(explicit){if(this.roundTeams.has(key)&&this.roundTeams.get(key)!==explicit)this.nextTeams.set(key,explicit);else this.teams.set(key,explicit)}
    if(this.roundTeams.has(key))return this.roundTeams.get(key);
    if(!this.teams.has(key)){const r=this.population('red'),b=this.population('blue');const t=r===b?this.autoSide:r<b?'red':'blue';this.autoSide=t==='red'?'blue':'red';this.teams.set(key,t)}
    return this.teams.get(key);
  }
  event(event,{demo=false,force=false,unranked=false}={}){
    const type=event.type||'comment';if(!['comment','like','gift','join','follow'].includes(type))return {added:0,ignored:true};
    const id=event.id||event.eventId;if(id&&this.seen.has(id))return {added:0,duplicate:true};
    if(id){this.seen.add(id);if(this.seen.size>10000)this.seen.delete(this.seen.values().next().value)}
    const name=String(event.name||event.nickname||'直播观众').slice(0,40),key=String(event.userId||event.uid||name);
    const team=this.assign(key,type==='comment'?chosenTeam(event.text):null),amount=Math.min(100,Math.max(1,Math.floor(Number(event.count)||1)));
    this.lastActivity=this.time;if(type==='comment')this.stats.comment++;if(type==='like')this.stats.like+=amount;if(type==='gift')this.stats.gift++;
    const label={comment:'评论',like:'点赞',join:'进场',follow:'关注',gift:'礼物'}[type];
    if(!force&&!this.settings[type])return {added:0,team,name,disabled:true,nextTeam:this.nextTeams.get(key)};
    const isGift=type==='gift',effect=isGift?giftEffect(event):null;
    const options=isGift?{count:effect.count,size:this.settings.giftSize==='large'?'large':'small',priority:this.settings.giftPriority!==false}:printOptions(this.settings,'like',label);
    const amountUsed=isGift||type==='like'?amount:1;
    if(this.queue.length+options.count*amountUsed>2000){this.dropped++;return {added:0,overflow:true,team,name}}
    const result=this.rules.event(isGift?'other':'like',{name,key,avatar:String(event.avatar||event.avatarUrl||''),team,demo,unranked,weapon:effect?.weapon||'fist'},null,amountUsed,options);
    for(const job of result.jobs){job.source=label;job.comment=type==='comment';job.giftName=effect?.name||''}
    if(type==='comment'){const jobs=this.queue.splice(result.index,result.added);let at=this.queue.findIndex(j=>!j.priority&&!j.comment);if(at<0)at=this.queue.length;this.queue.splice(at,0,...jobs)}
    return {...result,team,name,weapon:effect?.weapon||'fist',gift:effect?.key,nextTeam:this.nextTeams.get(key)};
  }
  clearDemo(){this.units=this.units.filter(u=>!u.demo);this.rules.queue=this.queue.filter(u=>!u.demo)}
  spawn(job){
    const large=job.size==='large',lane=this.serial%13-6,key=job.key||job.name;
    const team=this.roundTeams.get(key)||this.assign(key,job.team);this.roundTeams.set(key,team);
    const weapon='fist',w=WEAPONS.fist;
    const unit={...job,key,team,weapon,id:++this.serial,x:team==='red'?-16:16,z:lane*1.2,hp:large?180:100,maxHp:large?180:100,attack:Math.round(w.attack*(large?1.5:1)),speed:large?2.4:2.9,radius:large?.9:.65,cooldown:this.random()*.25,age:0,deadAge:0,hit:0,swing:0,target:null};
    this.units.push(unit);this.total[team]++;if(!unit.unranked){this.participants.set(key,{key,team})}return unit;
  }
  finishRound(){
    if(this.phase!=='fighting')return;
    const winner=this.score.red===this.score.blue?null:this.score.red>this.score.blue?'red':'blue';
    this.lastResult={round:this.round,winner,score:{...this.score},participants:this.participants.size};this.phase='result';this.intermission=7;this.remaining=0;
  }
  nextRound(){
    this.round++;this.phase='fighting';this.remaining=90;this.score={red:0,blue:0};this.units=[];this.hits=[];this.roundTeams.clear();this.participants.clear();
    for(const[k,t]of this.nextTeams)this.teams.set(k,t);this.nextTeams.clear();
    for(const job of this.queue)job.team=this.teams.get(job.key)||job.team;
    this.spawnClock=0;
  }
  step(dt){
    if(this.paused)return;dt=Math.max(0,Math.min(.05,dt));this.time+=dt;
    if(this.phase==='result'){this.intermission-=dt;if(this.intermission<=0)this.nextRound();return}
    this.remaining=Math.max(0,this.remaining-dt);this.spawnClock-=dt;this.hits=this.hits.filter(h=>(h.life-=dt)>0);
    if(this.spawnClock<=0){for(const team of ['red','blue']){if(this.units.filter(u=>u.team===team&&u.hp>0).length>=60)continue;const index=this.queue.findIndex(u=>u.team===team);if(index>=0)this.spawn(this.queue.splice(index,1)[0])}this.spawnClock=.18}
    const alive=this.units.filter(u=>u.hp>0),damage=new Map();
    for(const u of this.units){u.age+=dt;u.hit=Math.max(0,u.hit-dt);u.swing=Math.max(0,u.swing-dt);if(u.hp<=0)u.deadAge+=dt}
    for(const u of alive){
      u.cooldown-=dt;let target=null,nearest=Infinity;
      for(const v of alive)if(v.team!==u.team){const d=Math.hypot(v.x-u.x,v.z-u.z);if(d<nearest){nearest=d;target=v}}
      u.target=target?.id||null;if(!target)continue;
      const w=WEAPONS[u.weapon],reach=u.radius+target.radius+w.reach;
      if(nearest>reach){const d=Math.min(u.speed*dt,nearest-reach);u.x+=(target.x-u.x)/nearest*d;u.z+=(target.z-u.z)/nearest*d}
      else if(u.cooldown<=0){u.cooldown=w.interval;u.swing=.38;const hits=damage.get(target.id)||[];hits.push({amount:u.attack,attacker:u});damage.set(target.id,hits);this.hits.push({x:target.x,z:target.z,team:u.team,life:.4,amount:u.attack,weapon:u.weapon})}
    }
    // 伤害同帧结算；击倒归于本帧造成最大伤害的攻击者，计入攻击者所在阵营的当局击倒数。
    for(const u of alive){const hits=damage.get(u.id);if(!hits)continue;const amount=hits.reduce((n,h)=>n+h.amount,0);const attacker=hits.sort((a,b)=>b.amount-a.amount||a.attacker.id-b.attacker.id)[0].attacker;u.hp=Math.max(0,u.hp-amount);u.hit=.2;
      const d=Math.hypot(u.x-attacker.x,u.z-attacker.z)||1,k=WEAPONS[attacker.weapon].knockback;u.x+=(u.x-attacker.x)/d*k;u.z+=(u.z-attacker.z)/d*k;
      if(u.hp===0){if(!attacker.unranked&&!u.unranked){this.score[attacker.team]++;}this.killFeed.unshift({attacker:attacker.name,target:u.name,weapon:attacker.weapon,team:attacker.team});this.killFeed.length=Math.min(8,this.killFeed.length)}
    }
    for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){const a=alive[i],b=alive[j];if(a.hp<=0||b.hp<=0)continue;let dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),gap=(a.radius+b.radius)*1.05;if(d<gap){if(d<.001){dx=.001;dz=.001;d=Math.hypot(dx,dz)}const f=(gap-d)*.2;a.x-=dx/d*f;a.z-=dz/d*f;b.x+=dx/d*f;b.z+=dz/d*f}}
    for(const u of this.units){const ellipse=Math.sqrt((u.x/18)**2+(u.z/11)**2);if(ellipse>1){u.x/=ellipse;u.z/=ellipse}}
    this.units=this.units.filter(u=>u.hp>0||u.deadAge<1.15);if(this.remaining<=1e-7)this.finishRound();
  }
  summary(){return {time:this.time,paused:this.paused,round:this.round,remaining:this.remaining,phase:this.phase,intermission:this.intermission,result:this.lastResult,score:{...this.score},alive:{red:this.units.filter(u=>u.team==='red'&&u.hp>0).length,blue:this.units.filter(u=>u.team==='blue'&&u.hp>0).length},queued:this.queue.length,total:{...this.total},stats:{...this.stats},dropped:this.dropped}}
}
