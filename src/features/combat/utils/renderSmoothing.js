// Presentation-only helpers; physics and hit detection remain server-authoritative.
export function smoothingFactor(deltaSeconds,response=18){
 const dt=Math.max(0,Math.min(Number(deltaSeconds)||0,.1));
 const rate=Math.max(0,Number(response)||0);
 return 1-Math.exp(-dt*rate);
}
export function shortestAngleDelta(from,to){
 return Math.atan2(Math.sin(to-from),Math.cos(to-from));
}
