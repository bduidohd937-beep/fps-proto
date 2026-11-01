// Shared, original FPS recoil model. Server owns shot direction; client mirrors only visual kick.
// Patterns repeat within a burst and reset after a pause; no other game's assets/code are copied.
export const RECOIL_RESET_MS=650;
export const STANCE_AIM=Object.freeze({
 standing:Object.freeze({spread:1,recoil:1}),
 walking:Object.freeze({spread:1.2,recoil:1.1}),
 sprinting:Object.freeze({spread:2.4,recoil:1.35}),
 crouched:Object.freeze({spread:.72,recoil:.74}),
 prone:Object.freeze({spread:.47,recoil:.52}),
 airborne:Object.freeze({spread:2.8,recoil:1.6})
});
const PATTERNS=Object.freeze({
 AR4:Object.freeze([[0,0],[.28,.8],[-.24,1.5],[.43,2.3],[-.38,3.1],[.55,3.7],[-.52,4.2]]),
 VXR9:Object.freeze([[0,0],[-.36,.6],[.40,1.1],[-.52,1.8],[.48,2.3],[-.35,2.8],[.26,3.2]]),
 MKR12:Object.freeze([[0,0],[.20,1.7]]),
 BR7:Object.freeze([[0,0],[.48,1.5],[-.44,2.7],[.50,3.7],[-.58,4.4]]),
 PX9:Object.freeze([[0,0],[.18,.8],[-.16,1.4]]),
 SG12:Object.freeze([[0,0],[.42,1.9],[-.35,2.4]])
});
export function getStance(player){
 if(player.grounded===false)return 'airborne';
 if(player.prone)return 'prone';
 if(player.crouch)return 'crouched';
 if(player.input?.sprint&&Math.hypot(Number(player.input?.forward)||0,Number(player.input?.strafe)||0)>.1)return 'sprinting';
 if(Math.hypot(Number(player.input?.forward)||0,Number(player.input?.strafe)||0)>.1)return 'walking';
 return 'standing';
}
export function recoilPattern(weaponId,shotIndex=0){
 const pattern=PATTERNS[weaponId]||PATTERNS.AR4;
 const index=Math.max(0,Math.floor(Number.isFinite(shotIndex)?shotIndex:0));
 const point=pattern[index%pattern.length];
 const cycle=Math.floor(index/pattern.length);
 return {yaw:point[0]*.0016,pitch:point[1]*.00135+Math.min(cycle,3)*.0006};
}
export function getVisualKick(weapon,shotIndex,stance='standing'){
 const factor=STANCE_AIM[stance]||STANCE_AIM.standing;
 const pattern=recoilPattern(weapon.id,shotIndex);
 return {pitch:weapon.recoil*(stance==='prone'?.34:stance==='crouched'?.43:.56)*factor.recoil,
  yaw:pattern.yaw*4*factor.recoil};
}
