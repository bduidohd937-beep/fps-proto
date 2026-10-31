import express from 'express';
import http from 'node:http';
import {randomInt} from 'node:crypto';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Server} from 'socket.io';
import {MAX_HP,MAX_AMMO,RELOAD_MS,FIRE_COOLDOWN_MS,DAMAGE,KILLS_TO_WIN,RESPAWN_MS,SPAWNS,clamp,movePlayer,shotHitsPlayer} from '../shared/rules.js';

const app=express(),server=http.createServer(app);
const io=new Server(server,{maxHttpBufferSize:8192});
const rooms=new Map(),socketRooms=new Map();
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TICK_MS=1000/30, SNAPSHOT_EVERY=2;
const GAME_SERVICE = 'project-duel';
const GAME_PROTOCOL = 2;
app.get('/api/health',(_req,res)=>res.json({ok:true,service:GAME_SERVICE,protocol:GAME_PROTOCOL,version:'0.1.3',rooms:rooms.size}));
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
if(existsSync(dist)){
 app.use(express.static(dist));
 app.get(/.*/,(_req,res)=>res.sendFile(path.join(dist,'index.html')));
}
function roomCode(){
 let code;do{code=Array.from({length:6},()=>ALPHABET[randomInt(ALPHABET.length)]).join('');}while(rooms.has(code));
 return code;
}
function newPlayer(socket,index){
 const spawn=SPAWNS[index];
 return {id:socket.id,name:index===0?'BLUE':'RED',x:spawn.x,z:spawn.z,yaw:spawn.yaw,pitch:0,
  hp:MAX_HP,ammo:MAX_AMMO,kills:0,deaths:0,respawnAt:0,reloadAt:0,lastFireAt:0,
  input:{forward:0,strafe:0,sprint:false},lastInputAt:Date.now()};
}
function publicState(room){
 return {code:room.code,status:room.status,winnerId:room.winnerId,serverNow:Date.now(),targetKills:KILLS_TO_WIN,
  players:room.players.map(({id,name,x,z,yaw,pitch,hp,ammo,kills,deaths,respawnAt,reloadAt})=>
   ({id,name,x,z,yaw,pitch,hp,ammo,kills,deaths,respawnAt,reloadAt}))};
}
function broadcast(room){io.to(room.code).emit('match:state',publicState(room));}
function resetMatch(room){
 room.players.forEach((player,index)=>Object.assign(player,newPlayer({id:player.id},index)));
 room.status=room.players.length===2?'playing':'waiting';
 room.winnerId=null;
 broadcast(room);
}
function leave(socket){
 const code=socketRooms.get(socket.id);if(!code)return;
 socketRooms.delete(socket.id);socket.leave(code);
 const room=rooms.get(code);if(!room)return;
 room.players=room.players.filter(p=>p.id!==socket.id);
 if(!room.players.length){rooms.delete(code);return;}
 room.players[0].name='BLUE';resetMatch(room);
 io.to(code).emit('room:message','상대가 나갔습니다. 친구가 다시 입장하면 전투가 시작됩니다.');
}
io.on('connection',socket=>{
 socket.on('room:create',ack=>{
  leave(socket);
  const code=roomCode();
  const room={code,players:[newPlayer(socket,0)],status:'waiting',winnerId:null};
  rooms.set(code,room);socketRooms.set(socket.id,code);socket.join(code);
  socket.emit('room:ready',{code,playerId:socket.id});broadcast(room);
  if(typeof ack==='function')ack({ok:true,code,playerId:socket.id,state:publicState(room)});
 });
 socket.on('room:join',(raw,ack)=>{
  const reply=payload=>{if(typeof ack==='function')ack(payload);};
  const error=message=>{socket.emit('room:error',message);reply({ok:false,message});};
  const code=String(raw??'').trim().toUpperCase(),room=rooms.get(code);
  if(!room)return error('해당 방을 찾을 수 없습니다.');
  if(room.players.length>=2&&!room.players.some(p=>p.id===socket.id))
    return error('이미 두 명이 플레이 중인 방입니다.');
  if(socketRooms.get(socket.id)===code){
    socket.emit('room:ready',{code,playerId:socket.id});
    return reply({ok:true,code,playerId:socket.id,state:publicState(room)});
  }
  leave(socket);
  room.players.push(newPlayer(socket,room.players.length));
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
  player.input={forward:clamp(Number(data.forward)||0,-1,1),strafe:clamp(Number(data.strafe)||0,-1,1),sprint:data.sprint===true};
  player.lastInputAt=Date.now();
 });
 socket.on('player:reload',()=>{
  const room=rooms.get(socketRooms.get(socket.id));
  const player=room?.players.find(p=>p.id===socket.id);
  if(!player||room.status!=='playing'||player.hp<=0||player.reloadAt||player.ammo===MAX_AMMO)return;
  player.reloadAt=Date.now()+RELOAD_MS;broadcast(room);
 });
 socket.on('player:fire',()=>{
  const room=rooms.get(socketRooms.get(socket.id));
  const shooter=room?.players.find(p=>p.id===socket.id),now=Date.now();
  if(!shooter||room.status!=='playing'||shooter.hp<=0||shooter.reloadAt||shooter.ammo<=0)return;
  if(now-shooter.lastFireAt<FIRE_COOLDOWN_MS)return;
  shooter.lastFireAt=now;shooter.ammo--;
  const target=room.players.find(p=>p.id!==shooter.id&&p.hp>0);
  const hit=!!target&&shotHitsPlayer(shooter,target);
  if(hit){
   target.hp=Math.max(0,target.hp-DAMAGE);
   if(target.hp===0){
    target.deaths++;shooter.kills++;target.respawnAt=now+RESPAWN_MS;
    if(shooter.kills>=KILLS_TO_WIN){room.status='finished';room.winnerId=shooter.id;}
   }
  }
  io.to(room.code).emit('match:shot',{shooterId:shooter.id,targetId:hit?target.id:null,eliminated:hit&&target.hp===0});
  broadcast(room);
 });
 socket.on('match:restart',()=>{
  const room=rooms.get(socketRooms.get(socket.id));
  if(room&&room.players.length===2&&room.status==='finished')resetMatch(room);
 });
 socket.on('disconnect',()=>leave(socket));
});
let lastTickAt=Date.now(),tickCount=0;
const ticker=setInterval(()=>{
 const now=Date.now(),dt=Math.min((now-lastTickAt)/1000,.05);
 lastTickAt=now;tickCount++;
 for(const room of rooms.values()){
  if(room.status!=='playing')continue;
  for(const player of room.players){
   if(player.reloadAt&&now>=player.reloadAt){player.ammo=MAX_AMMO;player.reloadAt=0;}
   if(!player.hp&&player.respawnAt&&now>=player.respawnAt){
    const spawn=SPAWNS[room.players.indexOf(player)];
    Object.assign(player,{x:spawn.x,z:spawn.z,yaw:spawn.yaw,pitch:0,hp:MAX_HP,ammo:MAX_AMMO,
      respawnAt:0,reloadAt:0,input:{forward:0,strafe:0,sprint:false}});
    io.to(player.id).emit('player:respawn',{yaw:spawn.yaw});
   }
   if(player.hp>0&&now-player.lastInputAt<300)
     Object.assign(player,movePlayer(player,{...player.input,yaw:player.yaw},dt));
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
server.listen(PORT,'0.0.0.0',()=>console.log('PROJECT DUEL V0.1.3 game server on port '+PORT));
