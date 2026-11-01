import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {io} from 'socket.io-client';
import {KILLS_TO_WIN,RESPAWN_MS} from '../shared/rules.js';

function event(socket,name,accept=()=>true,timeout=7000){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.off(name,listener);reject(new Error(`timeout: ${name}`));},timeout);
  const listener=value=>{if(!accept(value))return;clearTimeout(timer);socket.off(name,listener);resolve(value);};
  socket.on(name,listener);
 });
}
function ack(socket,name,...args){
 return new Promise((resolve,reject)=>socket.timeout(5000).emit(name,...args,(error,value)=>error?reject(error):resolve(value)));
}
async function boot(t){
 const port=40000+Math.floor(Math.random()*10000),url=`http://127.0.0.1:${port}`;
 const proc=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port)},stdio:'pipe'});
 t.after(()=>proc.kill('SIGTERM'));
 for(let i=0;i<100;i++){try{if((await fetch(url+'/api/health')).ok)return url;}catch{}await delay(50);}
 throw new Error('server did not start');
}
async function moveUntil(socket,playerId,input,arrived){
  const ready=event(socket,'match:state',s=>{const p=s.players.find(x=>x.id===playerId);return p&&arrived(p);},12000);
  const timer=setInterval(()=>socket.emit('player:input',input),100);
  socket.emit('player:input',input);
  const state=await ready;clearInterval(timer);return state;
}

test('current rules: real sockets complete death, respawn and 5-kill match restart',async t=>{
 const url=await boot(t),one=io(url,{transports:['websocket'],reconnection:false}),two=io(url,{transports:['websocket'],reconnection:false});
 t.after(()=>{one.disconnect();two.disconnect();});
 await Promise.all([event(one,'connect'),event(two,'connect')]);
 const room=await ack(one,'room:create'),code=room.code;
 const joined=await ack(two,'room:join',code);
 const state=joined.state;
 const shooter=state.players.find(p=>p.id===one.id);
 assert.equal(KILLS_TO_WIN,5,'V0.3.1 current rule is first-to-five');
 assert.notEqual(KILLS_TO_WIN,10,'10-kill rule belongs to a separate future design decision');
 await ack(one,'player:select-weapon','MKR12');
 const moveBase={pitch:0,sprint:false,crouch:false,prone:false,jump:false,ads:false};
 await moveUntil(one,one.id,{...moveBase,yaw:0,forward:0,strafe:-1},p=>p.x<-19.5);
 await moveUntil(one,one.id,{...moveBase,yaw:Math.PI,forward:1,strafe:0},p=>p.z>16.8);
 await moveUntil(one,one.id,{...moveBase,yaw:0,forward:0,strafe:1},p=>p.x>-17.2);
 one.emit('player:input',{yaw:-Math.PI/2,pitch:0,forward:0,strafe:0,sprint:false,crouch:false,prone:false,jump:false,ads:true});
 let finishedEvent;
 for(let kill=1;kill<=KILLS_TO_WIN;kill++){
  const dead=event(one,'match:state',s=>s.players.find(p=>p.id===two.id)?.hp===0);
  if(kill===KILLS_TO_WIN)finishedEvent=event(one,'match:state',s=>s.status==='finished'&&s.winnerId===one.id);
  const shot=event(one,'match:shot',s=>s.shooterId===one.id&&s.weaponId==='MKR12');
  one.emit('player:input',{yaw:-Math.PI/2,pitch:0,forward:0,strafe:0,sprint:false,crouch:false,prone:false,jump:false,ads:true});
  await delay(300);
  one.emit('player:fire');
  const shotData=await shot,deadState=await dead;
  assert.equal(shotData.eliminated,true);
  assert.equal(deadState.players.find(p=>p.id===one.id).kills,kill);
  if(kill<KILLS_TO_WIN){
   const respawn=event(two,'player:respawn',v=>v.x===17&&v.z===17,RESPAWN_MS+1500);
   await respawn;
   const alive=await event(one,'match:state',s=>s.players.find(p=>p.id===two.id)?.hp===100);
   assert.equal(alive.players.find(p=>p.id===two.id).deaths,kill);
  }
 }
 const finished=await finishedEvent;
 assert.equal(finished.players.find(p=>p.id===one.id).kills,5);
 const restarted=event(one,'match:state',s=>s.status==='playing'&&s.players.every(p=>p.kills===0&&p.deaths===0));
 one.emit('match:restart');
 const reset=await restarted;
 assert.equal(reset.players.length,2);
 assert.equal(reset.players.every(p=>p.hp===100&&p.ammo>0),true);
});

test('10-kill acceptance target is explicitly rejected by current V0.3.1 rules',()=>{
 assert.equal(KILLS_TO_WIN,5);
});
