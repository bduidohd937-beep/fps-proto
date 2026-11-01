import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {io} from 'socket.io-client';

async function bootServer(t){
 const port=37000+Math.floor(Math.random()*18000),url='http://127.0.0.1:'+port;
 const proc=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port)},stdio:'pipe'});
 t.after(()=>proc.kill('SIGTERM'));
 for(let i=0;i<70;i++){
  try{const result=await fetch(url+'/api/health');if(result.ok)return url;}catch{}
  await delay(100);
 }
 throw new Error('Server did not start');
}
function getEvent(socket,event,filter=()=>true,timeout=7500){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.off(event,listener);reject(new Error('Timeout '+event));},timeout);
  const listener=data=>{if(!filter(data))return;clearTimeout(timer);socket.off(event,listener);resolve(data);};
  socket.on(event,listener);
 });
}
function ack(socket,event,...args){
 return new Promise((resolve,reject)=>socket.timeout(5000).emit(event,...args,(err,data)=>err?reject(err):resolve(data)));
}
test('server starts playable solo mode immediately and the AI actually moves',async t=>{
 const url=await bootServer(t);
 const p1=io(url,{transports:['websocket'],reconnection:false});
 const p2=io(url,{transports:['websocket'],reconnection:false});
 t.after(()=>{p1.disconnect();p2.disconnect();});
 await Promise.all([getEvent(p1,'connect'),getEvent(p2,'connect')]);
 const badOperator=await ack(p1,'operator:select','__proto__');
 assert.equal(badOperator.ok,false);
 const operator=await ack(p1,'operator:select','ghost');
 assert.deepEqual(operator,{ok:true,operatorId:'ghost'});
 const started=await ack(p1,'room:create-solo',{difficulty:'rookie'});
 assert.equal(started.ok,true);
 assert.equal(started.state.mode,'solo');
 assert.equal(started.state.status,'playing');
 assert.equal(started.state.players.length,2);
 const human=started.state.players.find(p=>!p.bot),bot=started.state.players.find(p=>p.bot);
 assert.ok(human&&bot);
 assert.equal(human.operatorId,'ghost');
 assert.match(bot.name,/신병/);
 const rejection=await ack(p2,'room:join',started.code);
 assert.equal(rejection.ok,false);
 assert.match(rejection.message,/솔로/);
 // Real autonomous motion: the human sends zero movement messages.
 const first={x:bot.x,z:bot.z};
 const moving=await getEvent(p1,'match:state',state=>{
  const enemy=state.players.find(p=>p.bot);
  return enemy&&Math.hypot(enemy.x-first.x,enemy.z-first.z)>.5;
 },6000);
 assert.equal(moving.status,'playing');
 assert.equal(moving.players.find(p=>p.bot).bot,true);
 const switched=await ack(p1,'player:select-weapon','BR7');
 assert.equal(switched.ok,true);
 p1.emit('room:leave');
 for(let i=0;i<30;i++){
  await delay(40);
  const health=await (await fetch(url+'/api/health')).json();
  if(health.rooms===0)return;
 }
 assert.fail('solo bot room leaked after human left');
});
test('two solo rooms have independent bots and reject outside join attempts',async t=>{
 const url=await bootServer(t);
 const a=io(url,{transports:['websocket'],reconnection:false});
 const b=io(url,{transports:['websocket'],reconnection:false});
 t.after(()=>{a.disconnect();b.disconnect();});
 await Promise.all([getEvent(a,'connect'),getEvent(b,'connect')]);
 const [ar,br]=await Promise.all([
  ack(a,'room:create-solo',{difficulty:'rookie'}),
  ack(b,'room:create-solo',{difficulty:'regular'})
 ]);
 assert.notEqual(ar.code,br.code);
 assert.equal(ar.state.players[1].bot,true);
 assert.equal(br.state.players[1].bot,true);
 assert.match(br.state.players[1].name,/정규병/);
 assert.equal((await ack(a,'room:join',br.code)).ok,false);
 assert.equal((await (await fetch(url+'/api/health')).json()).rooms,2);
});
