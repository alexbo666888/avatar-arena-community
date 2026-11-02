import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleEngine, chosenTeam} from './battle-engine.mjs';
import {giftEffect, WEAPONS} from './arena-rules.mjs';
const step=(e,s)=>{for(let t=0;t<s;t+=.05)e.step(.05)};

test('固定礼物：小心心 3 人、墨镜 10 人、其余 1 人，均徒手',()=>{
  for(const [raw,count] of [['小心心',3],['墨镜',10],['玫瑰',1],['未知礼物',1]]){
    const e=new BattleEngine({giftEffects:{other:{count:50,weapon:'axe'}}});
    assert.equal(e.event({type:'gift',name:'观众',raw,count:2}).added,count*2);
    assert.ok(e.queue.every(j=>j.weapon==='fist'));
  }
  assert.deepEqual(Object.keys(WEAPONS),['fist']);
  assert.equal(giftEffect({gift:'other',raw:'墨镜'}).count,10);
});
test('选队、自动平衡、参战后锁队、下局换队',()=>{
  const e=new BattleEngine();
  assert.equal(chosenTeam('支持红队'),'red');
  const a=e.event({type:'comment',name:'甲',text:'红'});
  const b=e.event({type:'comment',name:'乙',text:'你好'});
  assert.equal(a.team,'red');assert.equal(b.team,'blue');step(e,.1);
  assert.equal(e.event({type:'comment',name:'甲',text:'蓝'}).team,'red');
  e.finishRound();e.nextRound();
  assert.equal(e.event({type:'comment',name:'甲'}).team,'blue');
});
test('去重、关闭触发与队列溢出明确返回',()=>{
  const e=new BattleEngine();
  assert.equal(e.event({id:'x',type:'gift',name:'甲',gift:'heart'}).added,3);
  assert.equal(e.event({id:'x',type:'gift',name:'甲',gift:'heart'}).duplicate,true);
  assert.equal(e.event({type:'like',name:'甲'}).disabled,true);
  e.event({type:'gift',name:'甲',gift:'sunglasses',count:100});
  assert.equal(e.event({type:'gift',name:'甲',gift:'sunglasses',count:100}).overflow,true);
  assert.ok(e.queue.length<=2000);
});
test('徒手击倒、90 秒结算、平局、下一局保留援军',()=>{
  const e=new BattleEngine({},()=>0);
  const a=e.spawn({name:'甲',key:'a',team:'red',size:'small'});
  const b=e.spawn({name:'乙',key:'b',team:'blue',size:'small'});
  a.x=0;b.x=.5;a.z=b.z=0;b.hp=10;step(e,.05);
  assert.equal(e.score.red,1);assert.equal(b.hp,0);
  e.remaining=.05;step(e,.05);
  assert.equal(e.phase,'result');assert.equal(e.lastResult.winner,'red');
  e.event({type:'gift',name:'待入场',gift:'heart'});const queued=e.queue.length;
  e.nextRound();assert.equal(e.queue.length,queued);assert.equal(e.remaining,90);
  e.finishRound();assert.equal(e.lastResult.winner,null);
  assert.equal(typeof e.leaderboard,'undefined');assert.equal(e.records,undefined);
});
test('暂停冻结计时，伪造装备不会产生武器',()=>{
  const e=new BattleEngine();e.paused=true;step(e,1);assert.equal(e.time,0);
  assert.equal(e.spawn({name:'甲',team:'red',weapon:'spear'}).weapon,'fist');
});
