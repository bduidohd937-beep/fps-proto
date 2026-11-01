import {RESPAWN_MS,KILLS_TO_WIN} from '../../shared/rules.js';
import {getWeapon} from '../../shared/weapons.js';
import {traceShot,computeDamage,getShotSpread} from '../../shared/combat.js';

// Server-only hit resolution. The same rules are used by real sockets and bots.
// Returns null when a shot is denied by ammunition, switch delay or fire cadence.
export function applyFire(room,shooter,now=Date.now(),random=Math.random){
 const weapon=shooter&&getWeapon(shooter.weaponId);
 if(!shooter||room.status!=='playing'||shooter.hp<=0||shooter.reloadAt||shooter.ammo<=0||!weapon)return null;
 if(now<shooter.switchUntil||now-shooter.lastFireAt<weapon.fireIntervalMs)return null;
 shooter.lastFireAt=now;shooter.ammo--;shooter.magazines[weapon.id]=shooter.ammo;shooter.shotsFired++;
 const target=room.players.find(p=>p.id!==shooter.id&&p.hp>0);
 const spread=getShotSpread(weapon,shooter);
 const hit=target?traceShot(shooter,target,weapon,(random()*2-1)*spread,(random()*2-1)*spread):null;
 const damage=hit?computeDamage(weapon,hit.zone,hit.distance):0;
 shooter.bloom=Math.min(1.6,shooter.bloom+weapon.bloomPerShot);
 if(hit){
  target.hp=Math.max(0,target.hp-damage);
  if(target.hp===0){
   target.deaths++;shooter.kills++;target.respawnAt=now+RESPAWN_MS;
   if(shooter.kills>=KILLS_TO_WIN){room.status='finished';room.winnerId=shooter.id;}
  }
 }
 return {shooterId:shooter.id,targetId:hit?target.id:null,weaponId:weapon.id,zone:hit?.zone??null,damage,eliminated:!!hit&&target.hp===0,shotIndex:shooter.shotsFired};
}
export function updateReload(player,now){
 if(!player.reloadAt||now<player.reloadAt)return false;
 const weapon=getWeapon(player.reloadWeaponId);
 if(weapon){
  player.magazines[weapon.id]=weapon.magazine;
  if(player.weaponId===weapon.id)player.ammo=weapon.magazine;
 }
 player.reloadAt=0;player.reloadWeaponId=null;
 return true;
}
export function startReload(player,now){
 const weapon=getWeapon(player?.weaponId);
 if(!player||!weapon||player.hp<=0||player.reloadAt||player.ammo===weapon.magazine)return false;
 player.reloadAt=now+weapon.reloadMs;player.reloadWeaponId=weapon.id;
 return true;
}
