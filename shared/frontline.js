// FRONTLINE V0.2.2 — shared lightweight 3D collision and movement rules.
// Y is height; player positions use feet level. Server is authoritative.
export const ARENA_HALF=22;
export const PLAYER_RADIUS=.44;
export const PLAYER_HEIGHT=1.8;
export const CROUCH_HEIGHT=1.12;
export const PRONE_HEIGHT=.56;
export const PLAYER_EYE=1.55;
export const CROUCH_EYE=.96;
export const PRONE_EYE=.42;
export const WALK_SPEED=5.2;
export const RUN_SPEED=7.2;
export const CROUCH_SPEED=2.7;
export const PRONE_SPEED=1.3;
export const GRAVITY=22;
export const JUMP_HEIGHT=1.30;
export const JUMP_SPEED=Math.sqrt(2*GRAVITY*JUMP_HEIGHT);
export const STEP_HEIGHT=.32;
export const MAX_HP=100;
export const MAX_AMMO=24;
export const RELOAD_MS=1550;
export const FIRE_COOLDOWN_MS=175;
export const DAMAGE=25;
export const KILLS_TO_WIN=5;
export const RESPAWN_MS=2400;
export const MAX_SHOT_DISTANCE=70;
export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

// Collision and render share the same world specification. No external map assets needed.
const box=(kind,x,z,w,d,h,y=0)=>({kind,x,z,w,d,h,y});
export const WORLD_BOXES=[
 box('wall',0,-22,44,.65,6),
 box('wall',0,22,44,.65,6),
 box('wall',-22,0,.65,44,6),
 box('wall',22,0,.65,44,6),
 // Elevated tactical bridge, walkable at 2.6m; passes under its 2.32m underside.
 box('catwalk',0,0,12,3.8,.28,2.32),
 ...Array.from({length:10},(_,i)=>box('step',-15.5+i,0,1,2.5,.26*(i+1))),
 ...Array.from({length:10},(_,i)=>box('step',15.5-i,0,1,2.5,.26*(i+1))),
 box('support',-5,1.52,.48,.48,2.32),
 box('support',5,-1.52,.48,.48,2.32),
 box('container',-11,-9,4.4,3.2,2.6),
 box('container',11,9,4.4,3.2,2.6),
 box('container',-11,9,4.4,3.2,2.6),
 box('container',11,-9,4.4,3.2,2.6),
 box('container',0,-15,4.4,2.8,2.65),
 box('container',0,15,4.4,2.8,2.65),
 box('crate',-4.5,-6,2,1.8,1.04),
 box('crate',4.5,6,2,1.8,1.04),
 box('crate',-17,7,2.4,2.4,1.04),
 box('crate',17,-7,2.4,2.4,1.04),
 box('barrier',-4,10,3.2,1,.93),
 box('barrier',4,-10,3.2,1,.93),
 // Low overhead duct forces crouching to pass under it.
 box('beam',0,-8,4,1.15,.38,1.43),
 // A low pipe crossing that requires actual prone collision (0.56m tall).
 box('prone-beam',8,-5,3,1.1,.34,.82)
];
export const COVER=WORLD_BOXES.filter(b=>!['wall','step','catwalk'].includes(b.kind));
export const SPAWNS=[
 {x:-17,y:0,z:-17,yaw:-Math.PI/2},
 {x:17,y:0,z:17,yaw:Math.PI/2}
];

function overlapsFootprint(x,z,b,r=PLAYER_RADIUS){
 const nearestX=clamp(x,b.x-b.w/2,b.x+b.w/2);
 const nearestZ=clamp(z,b.z-b.d/2,b.z+b.d/2);
 return (x-nearestX)**2+(z-nearestZ)**2<r*r-1e-7;
}
function heightOverlaps(y,height,b){
 return y<b.y+b.h-.015 && y+height>b.y+.015;
}
function collisionBox(x,y,z,height){
 return WORLD_BOXES.find(b=>overlapsFootprint(x,z,b)&&heightOverlaps(y,height,b));
}
export function canFit(x,y,z,height){
 return !collisionBox(x,y,z,height);
}
function supportHeight(x,z,ceiling=Infinity){
 let floor=0;
 for(const b of WORLD_BOXES){
  const top=b.y+b.h;
  if(top<=ceiling+.015 && top>floor && overlapsFootprint(x,z,b))floor=top;
 }
 return floor;
}
export function overlapsCover(x,z,radius=PLAYER_RADIUS){
 return WORLD_BOXES.some(b=>b.kind!=='wall'&&b.kind!=='catwalk'&&b.kind!=='step'&&overlapsFootprint(x,z,b,radius));
}

// Deterministic 3D character simulation: gravity, jump, steps, ceiling, stand/crouch.
// Unlike camera-only animation, the Y coordinate is the actual collision/shot position.
export function movePlayer3D(position,input={},delta=1/30){
 const dt=clamp(Number(delta)||0,0,.05);
 let x=Number.isFinite(position.x)?position.x:0;
 let y=Number.isFinite(position.y)?Math.max(0,position.y):0;
 let z=Number.isFinite(position.z)?position.z:0;
 let vy=Number.isFinite(position.vy)?position.vy:0;
 let grounded=position.grounded!==false;
 const wantsProne=input.prone===true;
 // Do not stand through low ceilings; automatically remain prone/crouched until clear.
 const prone=wantsProne||!canFit(x,y,z,CROUCH_HEIGHT);
 const crouch=!prone&&(input.crouch===true||!canFit(x,y,z,PLAYER_HEIGHT));
 const height=prone?PRONE_HEIGHT:crouch?CROUCH_HEIGHT:PLAYER_HEIGHT;
 const yaw=Number.isFinite(input.yaw)?input.yaw:0;
 const forward=clamp(Number(input.forward)||0,-1,1);
 const strafe=clamp(Number(input.strafe)||0,-1,1);
 const diagonal=1/Math.max(1,Math.hypot(forward,strafe));
 const speed=prone?PRONE_SPEED:crouch?CROUCH_SPEED:input.sprint===true?RUN_SPEED:WALK_SPEED;
 const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed*dt*diagonal;
 const dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*speed*dt*diagonal;
 const bound=ARENA_HALF-PLAYER_RADIUS-.33;
 const advance=(axis,amount)=>{
  const nextX=axis==='x'?clamp(x+amount,-bound,bound):x;
  const nextZ=axis==='z'?clamp(z+amount,-bound,bound):z;
  const hit=collisionBox(nextX,y,nextZ,height);
  if(!hit){x=nextX;z=nextZ;return;}
  const top=hit.y+hit.h;
  if(grounded&&vy<=0&&top>y+.005&&top-y<=STEP_HEIGHT+.005&&canFit(nextX,top,nextZ,height)){
   x=nextX;z=nextZ;y=top;
  }
 };
 advance('x',dx);
 advance('z',dz);
 const jumpHeld=input.jump===true;
 const pressed=jumpHeld && position.jumpHeld!==true;
 if(grounded && pressed && !prone){
  vy=JUMP_SPEED;
  grounded=false;
 }
 if(grounded){
  const floor=supportHeight(x,z,y+.08);
  if(y-floor<=.09 && floor<=y+.08){y=floor;vy=0;}
  else grounded=false;
 }
 if(!grounded){
  const oldY=y;
  vy=Math.max(-28,vy-GRAVITY*dt);
  let nextY=Math.max(-.5,y+vy*dt);
  if(vy>0){
   for(const b of WORLD_BOXES){
    if(!overlapsFootprint(x,z,b))continue;
    if(oldY+height<=b.y+.015 && nextY+height>=b.y){
     nextY=Math.min(nextY,b.y-height);
     vy=0;
    }
   }
  }
  if(vy<=0){
   const floor=supportHeight(x,z,oldY+.02);
   if(nextY<=floor && oldY>=floor-.035){
    nextY=floor;vy=0;grounded=true;
   }
  }
  y=Math.max(0,nextY);
  if(y===0&&vy<0){vy=0;grounded=true;}
 }
 return {x,y,z,vy,grounded,crouch,prone,jumpHeld};
}
// Backwards-compatible horizontal helper for legacy test consumers.
export function movePlayer(pos,input,dt){
 const p=movePlayer3D({x:pos.x,y:pos.y??0,z:pos.z,vy:pos.vy??0,grounded:true},input,dt);
 return {x:p.x,z:p.z};
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
export function rayBox(origin,dir,b){
 const bounds={x:[b.x-b.w/2,b.x+b.w/2],y:[b.y,b.y+b.h],z:[b.z-b.d/2,b.z+b.d/2]};
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
 const origin={x:shooter.x,y:(shooter.y||0)+(shooter.prone?PRONE_EYE:shooter.crouch?CROUCH_EYE:PLAYER_EYE),z:shooter.z};
 const dir=aimDirection(shooter.yaw,shooter.pitch);
 const center={x:target.x,y:(target.y||0)+(target.prone?.30:target.crouch?.62:1),z:target.z};
 const radius=target.prone?.27:target.crouch?.57:.82;
 const distance=raySphere(origin,dir,center,radius);
 return distance<=MAX_SHOT_DISTANCE && WORLD_BOXES.every(b=>rayBox(origin,dir,b)>=distance-.001);
}
