import express from 'express';
import http from 'node:http';
import {randomInt} from 'node:crypto';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Server} from 'socket.io';
import {MAX_HP,KILLS_TO_WIN,RESPAWN_MS,SPAWNS,clamp,movePlayer3D} from '../shared/rules.js';
import {DEFAULT_WEAPON_ID,getWeapon,createMagazines} from '../shared/weapons.js';
import {traceShot,computeDamage,getShotSpread} from '../shared/combat.js';

const app=express(),server=http.createServer(app);
const io=new Server(server,{maxHttpBufferSize:8192});
const rooms=new Map(),socketRooms=new Map();
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TICK_MS=1000/30, SNAPSHOT_EVERY=2;
const GAME_SERVICE = 'project-duel';
const GAME_PROTOCOL = 4;
app.get('/api/health',(_req,res)=>res.json({ok:true,service:GAME_SERVICE,protocol:GAME_PROTOCOL,version:'0.2.3',rooms:rooms.size}));
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
 const spawn=SPAWNS[index],magazines=createMagazines();
 return {id:socket.id,name:index===0?'BLUE':'RED',x:spawn.x,y:spawn.y,z:spawn.z,vy:0,grounded:true,crouch:false,jumpHeld:false,yaw:spawn.yaw,pitch:0,
  hp:MAX_HP,ammo:magazines[DEFAULT_WEAPON_ID],weaponId:DEFAULT_WEAPON_ID,magazines,
  ads:false,bloom:0,shotsFired:0,switchUntil:0,reloadWeaponId:null,
  kills:0,deaths:0,respawnAt:0,reloadAt:0,lastFireAt:0,
  input:{forward:0,strafe:0,sprint:false,jump:false,crouch:false},lastInputAt:Date.now()};
}
function publicState(room){
 return {code:room.code,status:room.status,winnerId:room.winnerId,serverNow:Date.now(),targetKills:KILLS_TO_WIN,
  players:room.players.map(({id,name,x,y,z,vy,grounded,crouch,yaw,pitch,hp,ammo,weaponId,ads,kills,deaths,respawnAt,reloadAt})=>
   ({id,name,x,y,z,vy,grounded,crouch,yaw,pitch,hp,ammo,weaponId,ads,kills,deaths,respawnAt,reloadAt}))};
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
  const ads=data.ads===true&&data.sprint!==true;
  player.ads=ads;
  player.input={forward:clamp(Number(data.forward)||0,-1,1),strafe:clamp(Number(data.strafe)||0,-1,1),sprint:data.sprint===true&&!ads,jump:data.jump===true,crouch:data.crouch===true};
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
   player.ads=false;player.bloom=0;
   player.switchUntil=Date.now()+260;
   broadcast(room);
  }
  reply({ok:true,weaponId:player.weaponId,ammo:player.ammo});
 });
 socket.on('player:reload',()=>{
  const room=rooms.get(socketRooms.get(socket.id));
  const player=room?.players.find(p=>p.id===socket.id);
  const weapon=player&&getWeapon(player.weaponId);
  if(!player||room.status!=='playing'||player.hp<=0||player.reloadAt||!weapon||player.ammo===weapon.magazine)return;
  player.reloadAt=Date.now()+weapon.reloadMs;
  player.reloadWeaponId=weapon.id;
  broadcast(room);
 });
 socket.on('player:fire',()=>{
  const room=rooms.get(socketRooms.get(socket.id));
  const shooter=room?.players.find(p=>p.id===socket.id),now=Date.now();
  const weapon=shooter&&getWeapon(shooter.weaponId);
  if(!shooter||room.status!=='playing'||shooter.hp<=0||shooter.reloadAt||shooter.ammo<=0||!weapon)return;
  if(now<shooter.switchUntil||now-shooter.lastFireAt<weapon.fireIntervalMs)return;
  shooter.lastFireAt=now;shooter.ammo--;shooter.magazines[weapon.id]=shooter.ammo;
  shooter.shotsFired++;
  const target=room.players.find(p=>p.id!==shooter.id&&p.hp>0);
  const spread=getShotSpread(weapon,shooter);
  const hit=target?traceShot(shooter,target,weapon,(Math.random()*2-1)*spread,(Math.random()*2-1)*spread):null;
  const damage=hit?computeDamage(weapon,hit.zone,hit.distance):0;
  shooter.bloom=Math.min(1.6,shooter.bloom+weapon.bloomPerShot);
  if(hit){
   target.hp=Math.max(0,target.hp-damage);
   if(target.hp===0){
    target.deaths++;shooter.kills++;target.respawnAt=now+RESPAWN_MS;
    if(shooter.kills>=KILLS_TO_WIN){room.status='finished';room.winnerId=shooter.id;}
   }
  }
  io.to(room.code).emit('match:shot',{
   shooterId:shooter.id,targetId:hit?target.id:null,weaponId:weapon.id,
   zone:hit?.zone??null,damage,eliminated:!!hit&&target.hp===0,shotIndex:shooter.shotsFired
  });
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
   if(player.reloadAt&&now>=player.reloadAt){
    const weapon=getWeapon(player.reloadWeaponId);
    if(weapon){player.magazines[weapon.id]=weapon.magazine;if(player.weaponId===weapon.id)player.ammo=weapon.magazine;}
    player.reloadAt=0;player.reloadWeaponId=null;
   }
   if(!player.hp&&player.respawnAt&&now>=player.respawnAt){
    const spawn=SPAWNS[room.players.indexOf(player)];
    const magazines=createMagazines(),weapon=getWeapon(player.weaponId)??getWeapon(DEFAULT_WEAPON_ID);
    Object.assign(player,{x:spawn.x,y:spawn.y,z:spawn.z,vy:0,grounded:true,crouch:false,jumpHeld:false,yaw:spawn.yaw,pitch:0,
      hp:MAX_HP,magazines,ammo:magazines[weapon.id],weaponId:weapon.id,ads:false,bloom:0,switchUntil:0,reloadWeaponId:null,
      respawnAt:0,reloadAt:0,input:{forward:0,strafe:0,sprint:false,jump:false,crouch:false}});
    io.to(player.id).emit('player:respawn',{x:spawn.x,y:spawn.y,z:spawn.z,yaw:spawn.yaw});
   }
   if(player.hp>0){
    player.bloom=Math.max(0,player.bloom-dt*.85);
    const fresh=now-player.lastInputAt<300;
    const input=fresh?player.input:{forward:0,strafe:0,sprint:false,jump:false,crouch:player.input.crouch};
    Object.assign(player,movePlayer3D(player,{...input,yaw:player.yaw},dt));
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
server.listen(PORT,'0.0.0.0',()=>console.log('PROJECT DUEL FRONTLINE V0.2.3 game server on port '+PORT));
