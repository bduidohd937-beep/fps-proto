import express from 'express';
import http from 'node:http';
import {randomInt} from 'node:crypto';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Server} from 'socket.io';
import {MAX_HP,RESPAWN_MS,SPAWNS,clamp,movePlayer3D} from '../shared/rules.js';
import {DEFAULT_WEAPON_ID,getWeapon,createMagazines} from '../shared/weapons.js';
import {applyFire,startReload,updateReload} from './domain/combat.js';
import {getOperator,DEFAULT_OPERATOR_ID} from '../shared/operators.js';
import {updateBot,createBotBrain,BOT_DIFFICULTY} from './bots/controller.js';
import {GAME_SERVICE,GAME_VERSION,GAME_PROTOCOL} from '../shared/version.js';
import {newPlayer,publicState} from './domain/players.js';

const app=express(),server=http.createServer(app);
const io=new Server(server,{maxHttpBufferSize:8192});
const rooms=new Map(),socketRooms=new Map(),socketOperators=new Map();
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TICK_MS=1000/30, SNAPSHOT_EVERY=2;
app.get('/api/health',(_req,res)=>res.json({ok:true,service:GAME_SERVICE,protocol:GAME_PROTOCOL,version:GAME_VERSION,rooms:rooms.size}));
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
if(existsSync(dist)){
 app.use(express.static(dist));
 app.get(/.*/,(_req,res)=>res.sendFile(path.join(dist,'index.html')));
}
function roomCode(){
 let code;do{code=Array.from({length:6},()=>ALPHABET[randomInt(ALPHABET.length)]).join('');}while(rooms.has(code));
 return code;
}
function broadcast(room){io.to(room.code).emit('match:state',publicState(room));}
function resetMatch(room){
 room.players.forEach((player,index)=>{
  const operatorId=player.operatorId,bot=!!player.bot,id=player.id;
  Object.assign(player,newPlayer({id},index,{bot,operatorId,difficulty:room.difficulty}));
 });
 room.status=room.players.length===2?'playing':'waiting';
 room.winnerId=null;room.botBrain=createBotBrain();
 broadcast(room);
}
function startRoom(socket,{mode='private',difficulty='rookie'}={}){
 leave(socket);
 const code=roomCode();
 const human=newPlayer(socket,0,{operatorId:socketOperators.get(socket.id)||DEFAULT_OPERATOR_ID});
 const isSolo=mode==='solo';
 const players=isSolo?[human,newPlayer({id:'bot:'+code},1,{bot:true,operatorId:'bulwark',difficulty})]:[human];
 const room={code,mode:isSolo?'solo':'private',difficulty:isSolo?difficulty:null,
  players,status:isSolo?'playing':'waiting',winnerId:null,botBrain:isSolo?createBotBrain():null};
 rooms.set(code,room);socketRooms.set(socket.id,code);socket.join(code);
 socket.emit('room:ready',{code,playerId:socket.id});
 broadcast(room);
 return {ok:true,code,playerId:socket.id,state:publicState(room)};
}
function leave(socket){
 const code=socketRooms.get(socket.id);if(!code)return;
 socketRooms.delete(socket.id);socket.leave(code);
 const room=rooms.get(code);if(!room)return;
 room.players=room.players.filter(p=>p.id!==socket.id);
 if(!room.players.some(p=>!p.bot)){rooms.delete(code);return;}
 room.players[0].name='BLUE';resetMatch(room);
 io.to(code).emit('room:message','상대가 나갔습니다. 친구가 다시 입장하면 전투가 시작됩니다.');
}
io.on('connection',socket=>{
 socket.on('operator:select',(id,ack)=>{
  const operator=getOperator(id),room=rooms.get(socketRooms.get(socket.id));
  const respond=value=>{if(typeof ack==='function')ack(value);};
  if(!operator)return respond({ok:false,message:'지원하지 않는 오퍼레이터입니다.'});
  if(room?.status==='playing')return respond({ok:false,message:'전투 중에는 오퍼레이터를 교체할 수 없습니다.'});
  socketOperators.set(socket.id,operator.id);
  const player=room?.players.find(p=>p.id===socket.id);
  if(player){player.operatorId=operator.id;broadcast(room);}
  respond({ok:true,operatorId:operator.id});
 });
 socket.on('room:create',ack=>{
  const result=startRoom(socket);
  if(typeof ack==='function')ack(result);
 });
 socket.on('room:create-solo',(options,ack)=>{
  const difficulty=BOT_DIFFICULTY[options?.difficulty]?options.difficulty:'rookie';
  const result=startRoom(socket,{mode:'solo',difficulty});
  if(typeof ack==='function')ack(result);
 });
 socket.on('room:join',(raw,ack)=>{
  const reply=payload=>{if(typeof ack==='function')ack(payload);};
  const error=message=>{socket.emit('room:error',message);reply({ok:false,message});};
  const code=String(raw??'').trim().toUpperCase(),room=rooms.get(code);
  if(!room)return error('해당 방을 찾을 수 없습니다.');
  if(room.mode==='solo')return error('솔로 AI 방에는 친구가 참가할 수 없습니다. 비공개 방을 이용해 주세요.');
  if(room.players.length>=2&&!room.players.some(p=>p.id===socket.id))
    return error('이미 두 명이 플레이 중인 방입니다.');
  if(socketRooms.get(socket.id)===code){
    socket.emit('room:ready',{code,playerId:socket.id});
    return reply({ok:true,code,playerId:socket.id,state:publicState(room)});
  }
  leave(socket);
  room.players.push(newPlayer(socket,room.players.length,{operatorId:socketOperators.get(socket.id)||DEFAULT_OPERATOR_ID}));
  socketRooms.set(socket.id,code);socket.join(code);
  socket.emit('room:ready',{code,playerId:socket.id});
  resetMatch(room);io.to(code).emit('room:message','두 플레이어 연결 완료! 전투 시작!');
  reply({ok:true,code,playerId:socket.id,state:publicState(room)});
 });
 socket.on('room:leave',()=>leave(socket));
 socket.on('player:input',data=>{
  const room=rooms.get(socketRooms.get(socket.id));
  const player=room?.players.find(p=>p.id===socket.id);
  if(!player||room.status!=='playing'||!data||typeof data!=='object')return;
  if(!Number.isFinite(data.yaw)||!Number.isFinite(data.pitch))return;
  player.yaw=clamp(data.yaw,-100000,100000);
  player.pitch=clamp(data.pitch,-Math.PI/2+.05,Math.PI/2-.05);
  const ads=data.ads===true&&data.sprint!==true;
  player.ads=ads;
  player.input={forward:clamp(Number(data.forward)||0,-1,1),strafe:clamp(Number(data.strafe)||0,-1,1),sprint:data.sprint===true&&!ads&&data.prone!==true&&data.crouch!==true,jump:data.jump===true,crouch:data.crouch===true,prone:data.prone===true};
  player.lastInputAt=Date.now();
 });
 socket.on('player:select-weapon',(id,ack)=>{
  const room=rooms.get(socketRooms.get(socket.id));
  const player=room?.players.find(p=>p.id===socket.id),weapon=getWeapon(id);
  const reply=result=>{if(typeof ack==='function')ack(result);};
  if(!player||room.status!=='playing'||player.hp<=0)return reply({ok:false,message:'장비를 변경할 수 없습니다.'});
  if(!weapon)return reply({ok:false,message:'지원하지 않는 무기입니다.'});
  if(player.weaponId!==weapon.id){
   player.weaponId=weapon.id;
   player.ammo=player.magazines[weapon.id];
   player.reloadAt=0;player.reloadWeaponId=null;
   player.ads=false;player.bloom=0;player.recoilShots=0;
   player.switchUntil=Date.now()+260;
   broadcast(room);
  }
  reply({ok:true,weaponId:player.weaponId,ammo:player.ammo});
 });
 socket.on('player:reload',()=>{
  const room=rooms.get(socketRooms.get(socket.id));
  const player=room?.players.find(p=>p.id===socket.id);
  if(!player||room.status!=='playing'||!startReload(player,Date.now()))return;
  broadcast(room);
 });
 socket.on('player:fire',()=>{
  const room=rooms.get(socketRooms.get(socket.id));
  const shooter=room?.players.find(p=>p.id===socket.id);
  if(!room||!shooter)return;
  const event=applyFire(room,shooter,Date.now());
  if(!event)return;
  io.to(room.code).emit('match:shot',event);
  broadcast(room);
 });
 socket.on('match:restart',()=>{
  const room=rooms.get(socketRooms.get(socket.id));
  if(room&&room.players.length===2&&room.status==='finished')resetMatch(room);
 });
 socket.on('disconnect',()=>{leave(socket);socketOperators.delete(socket.id);});
});
let lastTickAt=Date.now(),tickCount=0;
const ticker=setInterval(()=>{
 const now=Date.now(),dt=Math.min((now-lastTickAt)/1000,.05);
 lastTickAt=now;tickCount++;
 for(const room of rooms.values()){
  if(room.status!=='playing')continue;
  for(const player of room.players){
   updateReload(player,now);
   if(!player.hp&&player.respawnAt&&now>=player.respawnAt){
    const spawn=SPAWNS[room.players.indexOf(player)];
    const magazines=createMagazines(),weapon=getWeapon(player.weaponId)??getWeapon(DEFAULT_WEAPON_ID);
    Object.assign(player,{x:spawn.x,y:spawn.y,z:spawn.z,vy:0,grounded:true,crouch:false,prone:false,jumpHeld:false,yaw:spawn.yaw,pitch:0,
      hp:MAX_HP,magazines,ammo:magazines[weapon.id],weaponId:weapon.id,ads:false,bloom:0,recoilShots:0,switchUntil:0,reloadWeaponId:null,
      respawnAt:0,reloadAt:0,input:{forward:0,strafe:0,sprint:false,jump:false,crouch:false,prone:false}});
    if(player.bot){room.botBrain=createBotBrain(now);}
    else io.to(player.id).emit('player:respawn',{x:spawn.x,y:spawn.y,z:spawn.z,yaw:spawn.yaw});
   }
   if(player.hp>0&&!player.bot){
    player.bloom=Math.max(0,player.bloom-dt*.85);
    const fresh=now-player.lastInputAt<300;
    const input=fresh?player.input:{forward:0,strafe:0,sprint:false,jump:false,crouch:player.input.crouch,prone:player.input.prone};
    Object.assign(player,movePlayer3D(player,{...input,yaw:player.yaw},dt));
   }
  }
  if(room.mode==='solo'&&room.status==='playing'){
   const bot=room.players.find(player=>player.bot);
   const human=room.players.find(player=>!player.bot);
   if(bot&&human){
    bot.bloom=Math.max(0,bot.bloom-dt*.85);
    updateBot(room,bot,human,now,dt,shot=>io.to(room.code).emit('match:shot',shot));
   }
  }
  if(tickCount%SNAPSHOT_EVERY===0)broadcast(room);
 }
},TICK_MS);
ticker.unref();
const PORT=Number(process.env.PORT || process.env.GAME_PORT)||43171;
server.on('error',error=>{
 console.error('PROJECT DUEL server startup failed:',error.code||error.message);
 process.exitCode=1;
});
server.listen(PORT,'0.0.0.0',()=>console.log('PROJECT DUEL FRONTLINE V0.3.1 game server on port '+PORT));
