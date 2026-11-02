import {SceneChannel} from './scene-channel.mjs';
export class BattleStream {
  constructor(view,onStatus){this.view=view;this.onStatus=onStatus;this.channel=new SceneChannel();this.pc=null;this.stream=null;this.pending=[];this.lastSeen=0;this.channel.onmessage=e=>this.receive(e.data);setInterval(()=>{if(this.pc&&Date.now()-this.lastSeen>12000)this.close()},3000)}
  send(m){this.channel.postMessage(m)}
  close(){this.pc?.close();this.pc=null;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.onStatus('直播小窗已关闭')}
  frame(){if(this.pc)this.stream?.getVideoTracks()[0]?.requestFrame()}
  size(){this.send({type:'view-size',width:this.view.canvas.width,height:this.view.canvas.height})}
  camera(){this.send({type:'view-camera',p:this.view.camera.position.toArray(),t:this.view.controls.target.toArray(),fov:this.view.camera.fov})}
  async receive(m){
    try{
      if(m.type==='view-request'){
        this.pc?.close();this.pending=[];this.lastSeen=Date.now();this.pc=new RTCPeerConnection();const pc=this.pc;
        this.stream??=this.view.canvas.captureStream(30);this.stream.getVideoTracks().forEach(t=>t.contentHint='detail');this.stream.getTracks().forEach(t=>pc.addTrack(t,this.stream));
        const data=pc.createDataChannel('controls',{ordered:false,maxRetransmits:0});data.onmessage=e=>{try{this.receive(JSON.parse(e.data))}catch{}};
        pc.onicecandidate=e=>{if(e.candidate)this.send({type:'view-ice',candidate:e.candidate.toJSON()})};
        for(const sender of pc.getSenders()){const p=sender.getParameters();p.encodings??=[{}];if(!p.encodings.length)p.encodings=[{}];p.encodings[0].maxBitrate=12000000;p.encodings[0].maxFramerate=30;p.encodings[0].scaleResolutionDownBy=1;p.degradationPreference='maintain-resolution';try{await sender.setParameters(p)}catch{}}
        const offer=await pc.createOffer();await pc.setLocalDescription(offer);this.send({type:'view-offer',sdp:{type:offer.type,sdp:offer.sdp}});
      }else if(m.type==='view-answer'&&this.pc){await this.pc.setRemoteDescription(m.sdp);for(const c of this.pending.splice(0))await this.pc.addIceCandidate(c)}
      else if(m.type==='view-ice'&&this.pc){if(this.pc.remoteDescription)await this.pc.addIceCandidate(m.candidate);else this.pending.push(m.candidate)}
      else if(m.type==='view-ping'||m.type==='view-ready'){this.lastSeen=Date.now();if(m.type==='view-ready')this.size()}
      else if(m.type==='view-stats'){this.lastSeen=Date.now();this.onStatus(`小窗 ${m.width}×${m.height} · ${m.fps} FPS`)}
      else if(m.type==='view-camera-request')this.camera();
      else if(m.type==='view-camera-change'&&Array.isArray(m.p)&&Array.isArray(m.t)&&m.p.length===3&&m.t.length===3&&[...m.p,...m.t].every(Number.isFinite)){
        this.view.camera.position.fromArray(m.p);this.view.controls.target.fromArray(m.t);this.view.controls.update();
      }else if(m.type==='view-bye')this.close();
    }catch(e){this.onStatus('小窗连接失败，请关闭后重开：'+e.message)}
  }
}
