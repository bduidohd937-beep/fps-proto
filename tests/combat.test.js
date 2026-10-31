import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_WEAPON_ID,WEAPON_IDS,WEAPONS,getWeapon,createMagazines} from '../shared/weapons.js';
import {traceShot,computeDamage,getShotSpread} from '../shared/combat.js';

const shooter=(pitch=0)=>({x:-17,y:0,z:-17,yaw:-Math.PI/2,pitch,grounded:true,ads:true,crouch:false, input:{sprint:false}});
const target={x:-12,y:0,z:-17,hp:100,crouch:false};

test('four unique weapons have valid fire/reload data and independent magazines',()=>{
 assert.equal(WEAPON_IDS.length,4);
 assert.equal(DEFAULT_WEAPON_ID,'AR4');
 const magazines=createMagazines();
 for(const id of WEAPON_IDS){
  const w=getWeapon(id);
  assert.ok(w?.magazine>0);
  assert.ok(w?.fireIntervalMs>0 && w?.reloadMs>0);
  assert.ok(w?.spreadAds<w?.spreadHip);
  assert.equal(magazines[id],w.magazine);
 }
 magazines.AR4=0;
 assert.equal(createMagazines().AR4,24);
 assert.equal(getWeapon('INVALID'),null);
});
test('standing opponent head is a distinct hit zone',()=>{
 const result=traceShot(shooter(),target,WEAPONS.AR4);
 assert.equal(result?.zone,'head');
 assert.ok(result.distance>3&&result.distance<6);
});
test('aiming down to torso scores body not head',()=>{
 const result=traceShot(shooter(-.12),target,WEAPONS.AR4);
 assert.equal(result?.zone,'body');
});
test('a crouched head has lower vertical hitbox',()=>{
 const crouched={...target,crouch:true};
 const result=traceShot(shooter(-.13),crouched,WEAPONS.AR4);
 assert.equal(result?.zone,'head');
});
test('shipping container occludes a hit, regardless of weapon',()=>{
 const from={...shooter(),z:-9},to={...target,x:17,z:-9};
 for(const weapon of Object.values(WEAPONS)){
  assert.equal(traceShot(from,to,weapon),null,weapon.id);
 }
});
test('an enemy outside the weapon effective range cannot be hit',()=>{
 const far={...target,x:40,z:-17};
 assert.equal(traceShot(shooter(),far,WEAPONS.VXR9),null);
});
test('headshots hurt more than body and snipers kill with a clean headshot',()=>{
 const distance=5;
 const body=computeDamage(WEAPONS.MKR12,'body',distance);
 const head=computeDamage(WEAPONS.MKR12,'head',distance);
 assert.ok(head>body);
 assert.ok(head>=100);
 assert.ok(computeDamage(WEAPONS.AR4,'legs',distance)<computeDamage(WEAPONS.AR4,'body',distance));
});
test('range damage falloff is bounded and predictable',()=>{
 const weapon=WEAPONS.BR7;
 assert.equal(computeDamage(weapon,'body',0),weapon.damage);
 assert.ok(computeDamage(weapon,'body',weapon.range)<=weapon.damage);
 assert.ok(computeDamage(weapon,'body',weapon.range)>=weapon.damage*.74);
});
test('server spread reduces with ADS and increases while airborne or sprinting',()=>{
 const weapon=WEAPONS.AR4;
 const aimed=getShotSpread(weapon,shooter());
 const hip=getShotSpread(weapon,{...shooter(),ads:false});
 const airborne=getShotSpread(weapon,{...shooter(),ads:false,grounded:false});
 const sprint=getShotSpread(weapon,{...shooter(),ads:false,input:{sprint:true}});
 assert.ok(aimed<hip);
 assert.ok(airborne>hip);
 assert.ok(sprint>hip);
});
test('headshots are not awarded when the shooter looks away',()=>{
 assert.equal(traceShot({...shooter(),yaw:Math.PI/2},target,WEAPONS.AR4),null);
});
