export const SENSITIVITY_STORAGE_KEY='project-duel-sensitivity';
export const DEFAULT_SENSITIVITY=Object.freeze({general:1,ads:.8});
export const SENSITIVITY_LIMITS=Object.freeze({general:{min:.1,max:3,step:.1},ads:{min:.3,max:1.5,step:.1}});

function finiteInRange(value,limits){
 const number=typeof value==='number'?value:Number(value);
 return Number.isFinite(number)&&number>=limits.min&&number<=limits.max?number:null;
}
export function sanitizeSensitivity(value){
 const source=value&&typeof value==='object'?value:{};
 const general=finiteInRange(source.general,SENSITIVITY_LIMITS.general);
 const ads=finiteInRange(source.ads,SENSITIVITY_LIMITS.ads);
 return {general:general??DEFAULT_SENSITIVITY.general,ads:ads??DEFAULT_SENSITIVITY.ads};
}
export function loadSensitivity(){
 try{return sanitizeSensitivity(JSON.parse(window.localStorage.getItem(SENSITIVITY_STORAGE_KEY)||'null'));}
 catch{return {...DEFAULT_SENSITIVITY};}
}
export function saveSensitivity(value){
 const safe=sanitizeSensitivity(value);
 try{window.localStorage.setItem(SENSITIVITY_STORAGE_KEY,JSON.stringify(safe));}catch{}
 return safe;
}
export function sensitivityForAim(settings,ads){
 const safe=sanitizeSensitivity(settings);
 return safe.general*(ads?safe.ads:1);
}
export const MOUSE_ROTATION_SCALE=.0022;
export function applyMouseRotation({yaw=0,pitch=0,movementX=0,movementY=0,settings,ads=false}){
 const multiplier=sensitivityForAim(settings,ads);
 const yawDelta=-movementX*MOUSE_ROTATION_SCALE*multiplier;
 const pitchDelta=-movementY*MOUSE_ROTATION_SCALE*multiplier;
 return {
  yaw:yaw+yawDelta,
  pitch:Math.max(-1.42,Math.min(1.42,pitch+pitchDelta)),
  yawDelta,
  pitchDelta,
  sensitivity:multiplier
 };
}
