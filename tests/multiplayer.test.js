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
 const left=waitFor(one,'match:state',state=>state.status==='waiting');
 two.disconnect();
 assert.equal((await left).players.length,1);
});
