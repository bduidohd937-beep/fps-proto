import {WORLD_BOXES,PLAYER_EYE,CROUCH_EYE,PRONE_EYE,aimDirection,raySphere,rayBox,clamp} from './rules.js';
import {WEAPONS,DEFAULT_WEAPON_ID} from './weapons.js';
import {getStance,STANCE_AIM} from './recoil.js';

// Client-supplied target IDs, damage values and hit-zone claims are never accepted.
export function traceShot(shooter,target,weapon=WEAPONS[DEFAULT_WEAPON_ID],yawOffset=0,pitchOffset=0){
 if(!target || target.hp<=0)return null;
 const origin={
  x:shooter.x,y:(shooter.y??0)+(shooter.prone?PRONE_EYE:shooter.crouch?CROUCH_EYE:PLAYER_EYE),z:shooter.z
 };
 const yaw=shooter.yaw+yawOffset;
 const pitch=clamp(shooter.pitch+pitchOffset,-Math.PI/2+.05,Math.PI/2-.05);
 const direction=aimDirection(yaw,pitch);
 const base=target.y??0;
 const head={
  x:target.x,
  y:base+(target.prone?.40:target.crouch?.91:1.62),
  z:target.z
 };
 const headDistance=raySphere(origin,direction,head,target.prone?.16:target.crouch?.205:.25);
 const bodyBox={
  x:target.x,z:target.z,w:.72,d:target.prone?1.0:.66,
  y:base+(target.prone?.08:target.crouch?.1:.28),h:target.prone?.32:target.crouch?.65:1.11
 };
 const legBox={
  x:target.x,z:target.z,w:.54,d:target.prone?.88:.56,
  y:base+.015,h:target.prone?.16:target.crouch?.20:.47
 };
 const hits=[
  {zone:'head',distance:headDistance},
  {zone:'body',distance:rayBox(origin,direction,bodyBox)},
  {zone:'legs',distance:rayBox(origin,direction,legBox)}
 ].filter(p=>p.distance>=0&&p.distance<=weapon.range&&Number.isFinite(p.distance))
  .sort((a,b)=>a.distance-b.distance);
 if(!hits.length)return null;
 const nearest=hits[0];
 for(const obstacle of WORLD_BOXES){
  if(rayBox(origin,direction,obstacle)<nearest.distance-.001)return null;
 }
 return nearest;
}
export function computeDamage(weapon,zone,distance){
 const fraction=clamp((distance-weapon.falloffStart)/Math.max(1,weapon.range-weapon.falloffStart),0,1);
 const falloff=1-.25*fraction;
 const region=zone==='head'?weapon.headMultiplier:zone==='legs'?.78:1;
 return Math.max(1,Math.round(weapon.damage*region*falloff));
}
export function getShotSpread(weapon,shooter){
 const initial=shooter.ads?weapon.spreadAds:weapon.spreadHip;
 const factor=STANCE_AIM[getStance(shooter)].spread;
 const bloom=1+clamp(shooter.bloom??0,0,2);
 return initial*factor*bloom;
}
