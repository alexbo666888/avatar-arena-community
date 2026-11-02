// 免费版只有徒手属性和固定礼物规则；完整版实现不随本仓库分发。
export const WEAPONS=Object.freeze({fist:Object.freeze({name:'徒手',attack:10,interval:.8,reach:.15,knockback:.12})});
export const GIFT_DEFAULTS=Object.freeze({heart:Object.freeze({name:'小心心',count:3}),sunglasses:Object.freeze({name:'墨镜',count:10}),other:Object.freeze({name:'其他礼物',count:1})});
export function giftEffect(event){
  const raw=String(event.raw||event.giftName||event.gift||'').trim();
  let key=Object.hasOwn(GIFT_DEFAULTS,event.gift)?event.gift:'other';
  if(/墨镜/.test(raw))key='sunglasses';else if(/小心心|爱心|红心/.test(raw))key='heart';
  return {key,...GIFT_DEFAULTS[key],weapon:'fist'};
}
