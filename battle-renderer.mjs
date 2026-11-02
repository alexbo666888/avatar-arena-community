import * as THREE from './assets/three.module.js';
import {OrbitControls} from './assets/OrbitControls.js';

export function avatarFallback(name) {
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  let n=0;for(const ch of name)n=(n*31+ch.charCodeAt(0))>>>0;
  x.fillStyle=['#9a654e','#586e9c','#628473','#97715f','#8e698f'][n%5];x.fillRect(0,0,128,128);
  x.fillStyle='#fff4e3';x.font='bold 66px Microsoft YaHei';x.textAlign='center';x.textBaseline='middle';x.fillText([...name][0]||'客',64,68);
  return c.toDataURL();
}
export class BattleRenderer {
  constructor(stage,engine) {
    this.engine=engine;this.nodes=new Map();this.textures=new Map();this.orientation='landscape';this.high=false;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c8beaa');
    this.camera=new THREE.PerspectiveCamera(39,16/9,.1,150);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.canvas=document.createElement('canvas');this.canvas.id='battle-canvas';this.canvas.setAttribute('aria-label','红蓝头像小人实时战场');
    this.ctx=this.canvas.getContext('2d',{alpha:false});stage.append(this.canvas);
    this.controls=new OrbitControls(this.camera,this.canvas);this.controls.enableDamping=true;this.controls.maxPolarAngle=Math.PI*.46;this.controls.minDistance=12;this.controls.maxDistance=50;
    this.scene.add(new THREE.HemisphereLight(0xffefd9,0x667579,2.2));
    this.light=new THREE.DirectionalLight(0xfff2dc,3);this.light.position.set(-5,15,10);this.light.castShadow=true;this.light.shadow.mapSize.set(2048,2048);Object.assign(this.light.shadow.camera,{left:-14,right:14,top:10,bottom:-10});this.light.shadow.normalBias=.03;this.scene.add(this.light);
    this.scene.add(new THREE.AmbientLight(0xffffff,.25));
    this.materials={red:this.mat('#da5947'),blue:this.mat('#487fc8'),cream:this.mat('#efe4ca'),dark:this.mat('#343e42'),skin:this.mat('#f0debd')};
    this.buildArena();this.resize('landscape');
  }
  mat(color){return new THREE.MeshStandardMaterial({color,roughness:.72})}
  mesh(geo,mat,parent=this.scene){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  box(w,h,d,x,y,z,mat,parent=this.scene){const m=this.mesh(new THREE.BoxGeometry(w,h,d),mat,parent);m.position.set(x,y,z);return m}
  buildArena(){
    const m=this.materials,stone=this.mat('#c6af8d'),edge=this.mat('#e1ceb0'),sand=this.mat('#d8bc8d');
    this.box(200,.2,200,0,-1.1,0,this.mat('#a79c86'));
    const foundation=this.mesh(new THREE.CylinderGeometry(24,25,1.4,80),stone);foundation.scale.z=.7;foundation.position.y=-.7;
    const floor=this.mesh(new THREE.CylinderGeometry(20,20,.15,80),sand);floor.scale.z=.65;floor.position.y=.03;
    for(let level=0;level<4;level++){
      const ring=this.mesh(new THREE.RingGeometry(20+level,21+level,96),level%2?stone:edge);ring.rotation.x=-Math.PI/2;ring.scale.y=.7;ring.position.y=.22+level*.48;
    }
    for(let i=0;i<44;i++){
      const angle=i*Math.PI*2/44,x=Math.cos(angle)*23,z=Math.sin(angle)*16,back=z<2,height=back?4.3:1;
      const pillar=this.mesh(new THREE.CylinderGeometry(.32,.42,height,8),edge);pillar.position.set(x,height/2,z);
      this.box(.9,.22,.9,x,height,z,stone);
      if(back){const a=angle+Math.PI/44,arch=this.mesh(new THREE.TorusGeometry(1.2,.22,8,20,Math.PI),edge);arch.position.set(Math.cos(a)*23,3.1,Math.sin(a)*16);arch.rotation.y=-a-Math.PI/2;}
      if(back&&i%2===0){const flag=this.box(.85,1.5,.08,x,2.5,z-.3,i%4?m.red:m.blue);flag.rotation.y=-angle-Math.PI/2;}
    }
    for(const team of ['red','blue']){
      const sign=team==='red'?-1:1;
      for(const z of [-5,5]){this.box(.22,4,.22,sign*18,2,z,m.dark);this.box(2.1,1.3,.1,sign*17.1,3.3,z,m[team]);}
      const zone=this.mesh(new THREE.CircleGeometry(3.4,48),new THREE.MeshStandardMaterial({color:team==='red'?'#b86a52':'#6a8ca3',roughness:.95}));zone.rotation.x=-Math.PI/2;zone.position.set(sign*15,.12,0);
      const ring=this.mesh(new THREE.TorusGeometry(3.5,.07,8,64),m.cream);ring.rotation.x=-Math.PI/2;ring.position.set(sign*15,.13,0);
    }
    const center=this.mesh(new THREE.TorusGeometry(4,.06,8,80),edge);center.rotation.x=-Math.PI/2;center.position.y=.13;
    this.box(.06,.02,23,0,.13,0,edge);
    this.effects=new THREE.Group();this.scene.add(this.effects);
  }
  resetCamera(){const portrait=this.orientation!=='landscape';this.camera.position.set(portrait?35:15,portrait?45:30,portrait?38:44);this.controls.maxDistance=95;this.controls.target.set(0,1,0);this.controls.update()}
  resize(orientation){this.orientation=orientation;const portrait=orientation==='portrait-1080p';const w=portrait?1080:1280,h=portrait?1920:720;this.canvas.width=w;this.canvas.height=h;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.canvas.parentElement.classList.toggle('portrait',portrait);this.resetCamera()}
  quality(value){this.high=value==='high';this.renderer.shadowMap.enabled=this.high}
  headTexture(unit){
    const key=unit.avatar||'name:'+unit.name;if(this.textures.has(key))return this.textures.get(key);
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const fallback=new Image();fallback.onload=()=>{ctx.drawImage(fallback,0,0,128,128);texture.needsUpdate=true};fallback.src=avatarFallback(unit.name);
    if(/^(https?:\/\/|data:image\/(png|jpeg|webp);base64,|blob:)/i.test(unit.avatar)){
      const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{const side=Math.min(img.width,img.height);ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,128,128);texture.needsUpdate=true};img.onerror=()=>{};img.src=unit.avatar;
    }
    this.textures.set(key,texture);return texture;
  }
  createUnit(u){
    const root=new THREE.Group();this.scene.add(root);const body=new THREE.Group();root.add(body);const color=this.materials[u.team];
    const torso=this.mesh(new THREE.CapsuleGeometry(.25,.42,4,10),color,body);torso.position.y=.95;
    const belt=this.box(.51,.09,.35,0,.7,0,this.materials.cream,body);
    const arms=[];const legs=[];
    for(const side of [-1,1]){
      const arm=new THREE.Group();arm.position.set(side*.36,1.13,0);body.add(arm);
      const limb=this.mesh(new THREE.CapsuleGeometry(.105,.32,4,8),color,arm);limb.position.y=-.17;
      const hand=this.mesh(new THREE.SphereGeometry(.14,10,8),this.materials.skin,arm);hand.position.set(0,-.4,0);arms.push(arm);
      const leg=new THREE.Group();leg.position.set(side*.15,.56,0);body.add(leg);
      const lower=this.mesh(new THREE.CapsuleGeometry(.12,.3,4,8),color,leg);lower.position.y=-.16;
      this.box(.26,.17,.36,0,-.38,.07,this.materials.dark,leg);legs.push(leg);
    }
    // 头像贴在实际头部的正面，头部始终面向镜头，网名另置于头顶。
    const head=new THREE.Group();head.position.y=1.68;root.add(head);
    const ball=this.mesh(new THREE.SphereGeometry(.46,20,14),this.materials.cream,head);ball.scale.z=.45;
    const face=this.mesh(new THREE.CircleGeometry(.425,40),new THREE.MeshBasicMaterial({map:this.headTexture(u),toneMapped:false}),head);face.position.z=.215;
    const rim=this.mesh(new THREE.TorusGeometry(.44,.035,8,40),color,head);rim.position.z=.18;
    const c=document.createElement('canvas');c.width=384;c.height=128;const x=c.getContext('2d');x.fillStyle='#172126e8';x.beginPath();x.roundRect(0,5,384,105,14);x.fill();x.fillStyle='#fff6e6';x.font='bold 29px Microsoft YaHei';x.textAlign='center';x.fillText(u.name.slice(0,10),192,43);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false}));sprite.scale.set(2.1,.7,1);sprite.position.y=2.55;root.add(sprite);
    const hp=new THREE.Group();hp.position.y=2.15;root.add(hp);
    this.box(.85,.075,.035,0,0,0,this.materials.dark,hp);
    const fill=this.box(.81,.047,.04,0,0,.03,color,hp);
    const shadow=this.mesh(new THREE.CircleGeometry(.46,20),new THREE.MeshBasicMaterial({color:0x514638,transparent:true,opacity:.18,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.1;
    const trailMat=new THREE.MeshBasicMaterial({color:u.team==='red'?'#ffe0aa':'#dcf4ff',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
    const trail=this.mesh(new THREE.TorusGeometry(.5,.035,5,18,1.7),trailMat,body);trail.position.set(.5,1.1,.4);trail.rotation.y=Math.PI/2;
    const node={root,body,head,arms,legs,fill,hp,sprite,shadow,trail,owned:[tex,face.material,sprite.material,shadow.material,trailMat]};this.nodes.set(u.id,node);return node;
  }
  disposeUnit(n){this.scene.remove(n.root,n.shadow);n.root.traverse(o=>{if(o.geometry)o.geometry.dispose()});n.shadow.geometry.dispose();for(const o of n.owned)o.dispose()}
  draw(){
    const units=this.engine.units;const ids=new Set(units.map(u=>u.id));for(const[id,n]of this.nodes)if(!ids.has(id)){this.disposeUnit(n);this.nodes.delete(id)}
    this.controls.update();
    for(const u of units){
      const n=this.nodes.get(u.id)||this.createUnit(u),scale=(u.size==='large'?1.3:1)*1.4;
      n.root.position.set(u.x,.08,u.z);n.root.scale.setScalar(scale*(u.hp<=0?Math.max(.05,1-u.deadAge*.65):Math.min(1,u.age*5)));
      n.root.rotation.z=u.hp<=0?Math.min(Math.PI/2,u.deadAge*4):0;
      const target=units.find(v=>v.id===u.target);const angle=target?Math.atan2(target.x-u.x,target.z-u.z):(u.team==='red'?Math.PI/2:-Math.PI/2);
      n.body.rotation.y=angle;n.head.quaternion.copy(this.camera.quaternion);n.hp.quaternion.copy(this.camera.quaternion);
      n.fill.scale.x=Math.max(0,u.hp/u.maxHp);n.fill.position.x=-(.81*(1-u.hp/u.maxHp))/2;
      n.sprite.visible=u.hp>0;n.hp.visible=u.hp>0;n.root.position.y+=u.hit>0?.05:0;
      const stride=target&&Math.hypot(target.x-u.x,target.z-u.z)>u.radius+target.radius+.3?Math.sin(u.age*11)*.6:0;
      n.legs[0].rotation.x=stride;n.legs[1].rotation.x=-stride;
      const swing=u.swing/.38;n.arms[0].rotation.x=-stride*.6;n.arms[1].rotation.x=u.swing>0?-2.6+Math.sin((1-swing)*Math.PI)*2:stride*.6;
      n.body.rotation.z=u.hit>0?Math.sin(u.hit*40)*.12:0;n.trail.material.opacity=u.swing>0?Math.sin(swing*Math.PI)*.75:0;n.trail.rotation.x=(1-swing)*3;
      n.shadow.position.set(u.x,.1,u.z);n.shadow.scale.setScalar(scale);
    }
    this.drawEffects();this.renderer.render(this.scene,this.camera);
    const x=this.ctx,w=this.canvas.width,h=this.canvas.height;x.drawImage(this.renderer.domElement,0,0,w,h);this.drawHud(x,w,h);
  }
  drawEffects(){
    while(this.effects.children.length){const o=this.effects.children[0];this.effects.remove(o);o.geometry.dispose();o.material.dispose()}
    for(const hit of this.engine.hits.slice(-40)){
      const progress=1-hit.life/.4,points=[];for(let i=0;i<6;i++){const angle=i*Math.PI/3,d=.2+progress*.8;points.push(hit.x+Math.cos(angle)*d,1.7+Math.sin(angle)*d,hit.z,hit.x+Math.cos(angle)*(d+.2),1.7+Math.sin(angle)*(d+.2),hit.z)}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const spark=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:hit.team==='red'?'#ffedac':'#deefff',transparent:true,opacity:1-progress}));this.effects.add(spark);
    }
  }
  drawHud(x,w,h){
    const s=this.engine.summary(),portrait=h>w;const margin=portrait?48:34,top=portrait?80:24,height=portrait?150:82;
    x.fillStyle='#172126ed';x.beginPath();x.roundRect(margin,top,w-2*margin,height,16);x.fill();
    const redX=margin+26,blueX=w-margin-26;
    x.textBaseline='middle';x.font=`bold ${portrait?38:26}px Microsoft YaHei`;x.textAlign='left';x.fillStyle='#f29a87';x.fillText('红方',redX,top+height*.35);x.textAlign='right';x.fillStyle='#9ac1f3';x.fillText('蓝方',blueX,top+height*.35);
    x.font=`${portrait?24:16}px Microsoft YaHei`;x.fillStyle='#f3eadb';x.textAlign='left';x.fillText(`${s.alive.red} 人在场 · 击倒 ${s.score.red}`,redX,top+height*.73);x.textAlign='right';x.fillText(`${s.alive.blue} 人在场 · 击倒 ${s.score.blue}`,blueX,top+height*.73);
    x.textAlign='center';x.font=`bold ${portrait?35:23}px Microsoft YaHei`;x.fillStyle='#eed5a6';x.fillText(this.engine.paused?'已暂停':`第 ${s.round} 局 · ${Math.ceil(s.remaining)} 秒`,w/2,top+height*.4);x.font=`${portrait?20:13}px Microsoft YaHei`;x.fillStyle='#d1d9d4';x.fillText(this.live?'直播互动 · 免费体验版':'虚构观众演示 · 免费体验版',w/2,top+height*.76);
    const y=h-(portrait?118:50);x.fillStyle='#172126df';x.beginPath();x.roundRect(w*.18,y-23,w*.64,46,23);x.fill();x.font=`${portrait?25:18}px Microsoft YaHei`;x.fillStyle='#fff0d5';x.fillText('评论「红 / 蓝」选队 · 用你的头像加入战斗',w/2,y);
    if(s.phase==='result'){
      const ww=w*.68,hh=portrait?330:220,left=(w-ww)/2,tt=(h-hh)/2;x.fillStyle='#182126f5';x.beginPath();x.roundRect(left,tt,ww,hh,20);x.fill();x.textAlign='center';x.fillStyle=s.result.winner==='red'?'#f29a87':s.result.winner==='blue'?'#9ac1f3':'#eed5a6';x.font=`bold ${portrait?58:40}px Microsoft YaHei`;x.fillText(s.result.winner?(s.result.winner==='red'?'红队获胜':'蓝队获胜'):'双方战平',w/2,tt+hh*.28);x.fillStyle='#f4e6cc';x.font=`${portrait?32:23}px Microsoft YaHei`;x.fillText(`击倒 ${s.result.score.red} : ${s.result.score.blue}`,w/2,tt+hh*.52);x.font=`${portrait?24:17}px Microsoft YaHei`;x.fillText('每局 90 秒 · 按阵营击倒数决胜',w/2,tt+hh*.72);x.fillText(`${Math.ceil(s.intermission)} 秒后下一局 · 排队援军继续保留`,w/2,tt+hh*.88);
    }
  }
  screenshot(){return this.canvas.toDataURL('image/png')}
}
