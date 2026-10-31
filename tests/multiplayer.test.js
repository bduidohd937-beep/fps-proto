import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {io} from 'socket.io-client';

function waitFor(socket,event,accept=()=>true,timeout=6000){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{
   socket.off(event,listener);
   reject(new Error('Timed out waiting for '+event));
  },timeout);
  function listener(data){
   if(!accept(data))return;
   clearTimeout(timer);socket.off(event,listener);resolve(data);
  }
  socket.on(event,listener);
 });
}
async function awaitServer(url){
 for(let i=0;i<80;i++){
  try{
   const res=await fetch(url+'/api/health');
   if(res.ok)return;
  }catch{}
  await delay(100);
 }
 throw new Error('Game server did not start');
}

test('two clients can create, join, shoot, reject third player and disconnect',async t=>{
 const port=34000+Math.floor(Math.random()*20000);
 const url='http://127.0.0.1:'+port;
 const proc=spawn(process.execPath,['server/index.js'],{
  env:{...process.env,PORT:String(port)},stdio:'pipe'
 });
 const clients=[];
 t.after(()=>{
  clients.forEach(client=>client.disconnect());
  proc.kill('SIGTERM');
 });
 await awaitServer(url);
 const health=await (await fetch(url+'/api/health')).json();
 assert.equal(health.ok,true);
 assert.equal(health.service,'project-duel');
 assert.equal(health.protocol,4);
 assert.equal(health.version,'0.2.3');
 const one=io(url,{transports:['websocket'],reconnection:false});
 clients.push(one);
 await waitFor(one,'connect');
 const firstReady=waitFor(one,'room:ready');
 const waiting=waitFor(one,'match:state',state=>state.status==='waiting');
 const createAck=new Promise((resolve,reject)=>one.timeout(4000).emit('room:create',(err,response)=>err?reject(err):resolve(response)));
 const {code}=await firstReady;
 assert.match(code,/^[A-Z2-9]{6}$/);
 const initial=await waiting;
 assert.equal(initial.players.length,1);
 const createResponse=await createAck;
 assert.equal(createResponse.ok,true);
 assert.equal(createResponse.code,code);
 assert.equal(createResponse.state.status,'waiting');
 assert.equal(createResponse.state.players.length,1);
 const two=io(url,{transports:['websocket'],reconnection:false});
 clients.push(two);
 await waitFor(two,'connect');
 const secondReady=waitFor(two,'room:ready');
 const started=waitFor(one,'match:state',state=>state.status==='playing');
 const joinAck=new Promise((resolve,reject)=>two.timeout(4000).emit('room:join',code,(err,response)=>err?reject(err):resolve(response)));
 assert.equal((await secondReady).code,code);
 assert.equal((await started).players.length,2);
 const joinResponse=await joinAck;
 assert.equal(joinResponse.ok,true);
 assert.equal(joinResponse.state.status,'playing');
 assert.equal(joinResponse.state.players.length,2);
 const third=io(url,{transports:['websocket'],reconnection:false});
 clients.push(third);
 await waitFor(third,'connect');
 const full=waitFor(third,'room:error');
 const fullAck=new Promise((resolve,reject)=>third.timeout(4000).emit('room:join',code,(err,response)=>err?reject(err):resolve(response)));
 assert.match(await full,/두 명/);
 const refused=await fullAck;
 assert.equal(refused.ok,false);
 assert.match(refused.message,/두 명/);
 const fired=waitFor(one,'match:state',state=>state.players.find(p=>p.id===one.id)?.ammo===23);
 one.emit('player:fire');
 assert.equal((await fired).players.find(p=>p.id===one.id).ammo,23);
 // Server rejects nonexistent weapons, and authoritative selection propagates to peers.
 const wrong=new Promise((resolve,reject)=>one.timeout(4000).emit('player:select-weapon','HACKED',(err,ack)=>err?reject(err):resolve(ack)));
 assert.equal((await wrong).ok,false);
 const switched=waitFor(two,'match:state',state=>state.players.find(p=>p.id===one.id)?.weaponId==='VXR9');
 const selected=new Promise((resolve,reject)=>one.timeout(4000).emit('player:select-weapon','VXR9',(err,ack)=>err?reject(err):resolve(ack)));
 assert.equal((await selected).ok,true);
 const smg=await switched;
 assert.equal(smg.players.find(p=>p.id===one.id).ammo,36);
 const aimState=waitFor(two,'match:state',state=>state.players.find(p=>p.id===one.id)?.ads===true);
 one.emit('player:input',{yaw:-Math.PI/2,pitch:0,forward:0,strafe:0,sprint:false,jump:false,crouch:false,ads:true});
 assert.equal((await aimState).players.find(p=>p.id===one.id).ads,true);
 await delay(330); // switch animation is enforced by the server
 const smgShot=waitFor(one,'match:shot',shot=>shot.shooterId===one.id&&shot.weaponId==='VXR9');
 const smgAmmo=waitFor(two,'match:state',state=>state.players.find(p=>p.id===one.id)?.ammo===35);
 one.emit('player:fire');
 assert.equal((await smgShot).weaponId,'VXR9');
 assert.equal((await smgAmmo).players.find(p=>p.id===one.id).ammo,35);
 const reloadingSmg=waitFor(one,'match:state',state=>state.players.find(p=>p.id===one.id)?.reloadAt>Date.now());
 one.emit('player:reload');
 assert.ok((await reloadingSmg).players.find(p=>p.id===one.id).reloadAt>Date.now());
 const rifleState=waitFor(two,'match:state',state=>state.players.find(p=>p.id===one.id)?.weaponId==='AR4');
 one.emit('player:select-weapon','AR4');
 assert.equal((await rifleState).players.find(p=>p.id===one.id).ammo,23);
 const smgAgain=waitFor(two,'match:state',state=>state.players.find(p=>p.id===one.id)?.weaponId==='VXR9');
 one.emit('player:select-weapon','VXR9');
 assert.equal((await smgAgain).players.find(p=>p.id===one.id).ammo,35);
 const sniperState=waitFor(one,'match:state',state=>state.players.find(p=>p.id===one.id)?.weaponId==='MKR12');
 one.emit('player:select-weapon','MKR12');
 assert.equal((await sniperState).players.find(p=>p.id===one.id).ammo,5);
 const battleState=waitFor(one,'match:state',state=>state.players.find(p=>p.id===one.id)?.weaponId==='BR7');
 one.emit('player:select-weapon','BR7');
 assert.equal((await battleState).players.find(p=>p.id===one.id).ammo,16);
 // Live server physics must expose the same airborne state to BOTH clients.
 const jumping=waitFor(one,'match:state',state=>state.players.find(p=>p.id===one.id)?.y>.1);
 const peerSeesJump=waitFor(two,'match:state',state=>state.players.find(p=>p.id===one.id)?.y>.1);
 const rest={yaw:-Math.PI/2,pitch:0,forward:0,strafe:0,sprint:false};
 one.emit('player:input',{...rest,jump:true,crouch:false});
 const air=await jumping;
 assert.equal(air.players.find(p=>p.id===one.id).grounded,false);
 assert.ok((await peerSeesJump).players.find(p=>p.id===one.id).y>.1);
 const crouchState=waitFor(two,'match:state',state=>state.players.find(p=>p.id===one.id)?.crouch===true);
 one.emit('player:input',{...rest,jump:false,crouch:true});
 assert.equal((await crouchState).players.find(p=>p.id===one.id).crouch,true);
 const left=waitFor(one,'match:state',state=>state.status==='waiting');
 two.disconnect();
 assert.equal((await left).players.length,1);
});
