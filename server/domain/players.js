import {MAX_HP,KILLS_TO_WIN,SPAWNS} from '../../shared/rules.js';
import {DEFAULT_WEAPON_ID,createMagazines} from '../../shared/weapons.js';
import {DEFAULT_OPERATOR_ID,validOperator} from '../../shared/operators.js';
// Pure player construction + public snapshot serialization. Server transport lives in index.js.
export function newPlayer(socket,index,{operatorId=DEFAULT_OPERATOR_ID,bot=false,difficulty='rookie'}={}){
 const spawn=SPAWNS[index],magazines=createMagazines();
 return {id:socket.id,name:bot?'BOT · '+(difficulty==='regular'?'정규병':'신병'):index===0?'BLUE':'RED',bot,operatorId:validOperator(operatorId),x:spawn.x,y:spawn.y,z:spawn.z,vy:0,grounded:true,crouch:false,prone:false,jumpHeld:false,yaw:spawn.yaw,pitch:0,
  hp:MAX_HP,ammo:magazines[DEFAULT_WEAPON_ID],weaponId:DEFAULT_WEAPON_ID,magazines,
  ads:false,bloom:0,recoilShots:0,shotsFired:0,switchUntil:0,reloadWeaponId:null,
  kills:0,deaths:0,respawnAt:0,reloadAt:0,lastFireAt:0,
  input:{forward:0,strafe:0,sprint:false,jump:false,crouch:false,prone:false},lastInputAt:Date.now()};
}
export function publicState(room){
 return {code:room.code,mode:room.mode||'private',difficulty:room.difficulty??null,status:room.status,winnerId:room.winnerId,serverNow:Date.now(),targetKills:KILLS_TO_WIN,
  players:room.players.map(({id,name,bot,operatorId,x,y,z,vy,grounded,crouch,prone,yaw,pitch,hp,ammo,weaponId,ads,kills,deaths,respawnAt,reloadAt})=>
   ({id,name,bot:!!bot,operatorId,x,y,z,vy,grounded,crouch,prone,yaw,pitch,hp,ammo,weaponId,ads,kills,deaths,respawnAt,reloadAt}))};
}
