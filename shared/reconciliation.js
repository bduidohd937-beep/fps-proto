// Client-side prediction reconciliation. The server remains authoritative.
export function reconcilePrediction(predicted,authoritative,delta,blendRate=8,snapDistanceSquared=16){
 const next={...predicted};
 const dx=authoritative.x-next.x,dy=(authoritative.y??0)-next.y,dz=authoritative.z-next.z;
 if(dx*dx+dy*dy+dz*dz>snapDistanceSquared){
  next.x=authoritative.x;next.y=authoritative.y??0;next.z=authoritative.z;next.vy=authoritative.vy??0;
  next.grounded=authoritative.grounded!==false;next.crouch=!!authoritative.crouch;next.prone=!!authoritative.prone;
  return next;
 }
 const factor=1-Math.exp(-Math.max(0,Number(delta)||0)*blendRate);
 next.x+=dx*factor;next.y+=dy*factor;next.z+=dz*factor;
 return next;
}
