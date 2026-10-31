export const ARENA_HALF=18;
export const PLAYER_RADIUS=0.44;
export const PLAYER_EYE=1.55;
export const WALK_SPEED=5.2;
export const RUN_SPEED=7.2;
export const MAX_HP=100;
export const MAX_AMMO=24;
export const RELOAD_MS=1550;
export const FIRE_COOLDOWN_MS=175;
export const DAMAGE=25;
export const KILLS_TO_WIN=5;
export const RESPAWN_MS=2400;
export const MAX_SHOT_DISTANCE=65;
export const COVER=[
 {x:0,z:0,w:3.5,d:3.5,h:2.7},
 {x:-6,z:-6.5,w:3.4,d:2,h:2.1},
 {x:6,z:6.5,w:3.4,d:2,h:2.1},
 {x:-6,z:6.5,w:3.4,d:2,h:2.1},
 {x:6,z:-6.5,w:3.4,d:2,h:2.1},
 {x:-12,z:0,w:1.5,d:5,h:1.7},
 {x:12,z:0,w:1.5,d:5,h:1.7}
];
export const SPAWNS=[
 {x:-14,z:-11,yaw:-Math.PI/2},
 {x:14,z:11,yaw:Math.PI/2}
];
export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function overlapsCover(x,z,radius=PLAYER_RADIUS){
 return COVER.some(c=>Math.abs(x-c.x)<c.w/2+radius && Math.abs(z-c.z)<c.d/2+radius);
}
export function movePlayer(pos,input,dt){
 const yaw=Number.isFinite(input.yaw)?input.yaw:0;
 const f=clamp(Number(input.forward)||0,-1,1);
 const s=clamp(Number(input.strafe)||0,-1,1);
 const scale=1/Math.max(1,Math.hypot(f,s));
 const speed=input.sprint?RUN_SPEED:WALK_SPEED;
 const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed*dt*scale;
 const dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed*dt*scale;
 const limit=ARENA_HALF-PLAYER_RADIUS;
 const x=clamp(pos.x+dx,-limit,limit), z=clamp(pos.z+dz,-limit,limit);
 const nextX=overlapsCover(x,pos.z)?pos.x:x;
 const nextZ=overlapsCover(nextX,z)?pos.z:z;
 return {x:nextX,z:nextZ};
}
export function aimDirection(yaw,pitch){
 return {x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};
}
export function raySphere(origin,dir,center,radius){
 const ox=origin.x-center.x,oy=origin.y-center.y,oz=origin.z-center.z;
 const b=ox*dir.x+oy*dir.y+oz*dir.z,c=ox*ox+oy*oy+oz*oz-radius*radius;
 const disc=b*b-c;if(disc<0)return Infinity;
 const root=Math.sqrt(disc),t1=-b-root,t2=-b+root;
 return t1>=0?t1:t2>=0?t2:Infinity;
}
export function rayBox(origin,dir,box){
 const bounds={x:[box.x-box.w/2,box.x+box.w/2],y:[0,box.h],z:[box.z-box.d/2,box.z+box.d/2]};
 let near=-Infinity,far=Infinity;
 for(const axis of ['x','y','z']){
  const [min,max]=bounds[axis],d=dir[axis];
  if(Math.abs(d)<1e-8){if(origin[axis]<min||origin[axis]>max)return Infinity;continue;}
  let a=(min-origin[axis])/d,b=(max-origin[axis])/d;
  if(a>b)[a,b]=[b,a];
  near=Math.max(near,a);far=Math.min(far,b);
  if(far<near)return Infinity;
 }
 return far<0?Infinity:Math.max(near,0);
}
export function shotHitsPlayer(shooter,target){
 const origin={x:shooter.x,y:PLAYER_EYE,z:shooter.z},dir=aimDirection(shooter.yaw,shooter.pitch);
 const distance=raySphere(origin,dir,{x:target.x,y:1,z:target.z},0.82);
 return distance<=MAX_SHOT_DISTANCE && COVER.every(c=>rayBox(origin,dir,c)>=distance);
}
