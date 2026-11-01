import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {io} from 'socket.io-client';

const event=(socket,name,filter=()=>true,timeout=4500)=>new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{socket.off(name,listener);reject(new Error('timeout: '+name));},timeout);
 const listener=value=>{if(!filter(value))return;clearTimeout(timer);socket.off(name,listener);resolve(value);};
 socket.on(name,listener);
});
const ack=(socket,name,...args)=>new Promise((resolve,reject)=>
 socket.timeout(5000).emit(name,...args,(err,result)=>err?reject(err):resolve(result))
);
test('Socket.IO server owns prone posture and emits recoil sequence for real shots',async t=>{
 const port=38000+Math.floor(Math.random()*17000);
 const url='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port)},stdio:'pipe'});
 t.after(()=>server.kill('SIGTERM'));
 let online=false;
 for(let i=0;i<70;i++){
  try{const res=await fetch(url+'/api/health');if(res.ok){online=true;break;}}catch{}
  await delay(70);
 }
 assert.equal(online,true);
 const socket=io(url,{transports:['websocket'],reconnection:false});
 t.after(()=>socket.disconnect());
 await event(socket,'connect');
 const result=await ack(socket,'room:create-solo',{difficulty:'rookie'});
 assert.equal(result.state.status,'playing');
 const id=socket.id;
 const input={yaw:-Math.PI/2,pitch:0,forward:0,strafe:0,sprint:false,crouch:false,prone:true,jump:true,ads:false};
 const prone=event(socket,'match:state',state=>state.players.find(p=>p.id===id)?.prone===true);
 socket.emit('player:input',input);
 const during=await prone;
 assert.equal(during.players.find(p=>p.id===id).prone,true);
 assert.equal(during.players.find(p=>p.id===id).grounded,true,'jump should not launch from prone');
 const shotEvent=event(socket,'match:shot',shot=>shot.shooterId===id);
 socket.emit('player:fire');
 const first=await shotEvent;
 assert.equal(first.recoilIndex,0);
 assert.equal(first.stance,'prone');
 const nextEvent=event(socket,'match:shot',shot=>shot.shooterId===id&&shot.shotIndex>first.shotIndex);
 await delay(205);
 socket.emit('player:fire');
 const second=await nextEvent;
 assert.equal(second.recoilIndex,1);
 const stand=event(socket,'match:state',state=>state.players.find(p=>p.id===id)?.prone===false);
 socket.emit('player:input',{...input,prone:false,jump:false});
 const state=await stand;
 assert.equal(state.players.find(p=>p.id===id).prone,false);
});
