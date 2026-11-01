import {RESPAWN_MS,KILLS_TO_WIN} from '../../shared/rules.js';
import {getWeapon} from '../../shared/weapons.js';
import {traceShot,computeDamage,getShotSpread} from '../../shared/combat.js';
import {RECOIL_RESET_MS,recoilPattern,getStance,STANCE_AIM} from '../../shared/recoil.js';

// Server-only hit resolution. The same rules are used by real sockets and bots.
// Returns null when a shot is denied by ammunition, switch delay or fire cadence.
export function applyFire(room,shooter,now=Date.now(),random=Math.random){
 const weapon=shooter&&getWeapon(shooter.weaponId);
 if(!shooter||room.status!=='playing'||shooter.hp<=0||shooter.reloadAt||shooter.ammo<=0||!weapon)return null;
 if(now<shooter.switchUntil||now-shooter.lastFireAt<weapon.fireIntervalMs)return null;
 const burstIndex=now-shooter.lastFireAt>RECOIL_RESET_MS?0:(shooter.recoilShots||0);
 const pattern=recoilPattern(weapon.id,burstIndex);
 const stance=getStance(shooter);
 shooter.recoilShots=burstIndex+1;
 shooter.lastFireAt=now;shooter.ammo--;shooter.magazines[weapon.id]=shooter.ammo;shooter.shotsFired++;
 const target=room.players.find(p=>p.id!==shooter.id&&p.hp>0);
 const spread=getShotSpread(weapon,shooter);
 const factor=STANCE_AIM[stance].recoil;
 const yawOffset=pattern.yaw*factor+(random()*2-1)*spread;
 const pitchOffset=pattern.pitch*factor+(random()*2-1)*spread;
 const hit=target?traceShot(shooter,target,weapon,yawOffset,pitchOffset):null;
 const damage=hit?computeDamage(weapon,hit.zone,hit.distance):0;
 shooter.bloom=Math.min(1.6,shooter.bloom+weapon.bloomPerShot);
 if(hit){
  target.hp=Math.max(0,target.hp-damage);
  if(target.hp===0){
   target.deaths++;shooter.kills++;target.respawnAt=now+RESPAWN_MS;
   if(shooter.kills>=KILLS_TO_WIN){room.status='finished';room.winnerId=shooter.id;}
  }
 }
 return {shooterId:shooter.id,targetId:hit?target.id:null,weaponId:weapon.id,zone:hit?.zone??null,damage,eliminated:!!hit&&target.hp===0,shotIndex:shooter.shotsFired,recoilIndex:burstIndex,stance,yawOffset,pitchOffset,spread};
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
