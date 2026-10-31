import {useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Vector3,Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import {PLAYER_EYE,CROUCH_EYE,movePlayer3D} from '../../shared/rules.js';
import {smoothingFactor,shortestAngleDelta} from '../game/renderSmoothing.js';
import {FrontlineArena} from './FrontlineArena.jsx';

const QUALITY_DPR={low:[.75,1],balanced:[1,1.25],high:[1,1.6]};
const CAMERA_CONFIG={fov:78,near:.06,far:110};

function Soldier({player}){
 const visual=useRef(null);
 const origin=useMemo(()=>({
  position:[player?.x??0,player?.y??0,player?.z??0],
  rotation:[0,player?.yaw??0,0]
 }),[player?.id]);
 useFrame((_,delta)=>{
  const model=visual.current;
  if(!model||!player||player.hp<=0)return;
  const dx=player.x-model.position.x,dy=(player.y??0)-model.position.y,dz=player.z-model.position.z;
  if(dx*dx+dy*dy+dz*dz>48)model.position.set(player.x,player.y??0,player.z);
  else{
   const blend=smoothingFactor(delta,18);
   model.position.x+=dx*blend;
   model.position.y+=dy*blend;
   model.position.z+=dz*blend;
  }
  model.rotation.y+=shortestAngleDelta(model.rotation.y,player.yaw)*smoothingFactor(delta,18);
 });
 if(!player||player.hp<=0)return null;
 const crouchScale=player.crouch?.67:1;
 return <group ref={visual} position={origin.position} rotation={origin.rotation}>
  <group scale={[1,crouchScale,1]}>
   <mesh position={[0,1.03,0]} castShadow>
    <capsuleGeometry args={[.34,.53,6,10]}/>
    <meshStandardMaterial color="#485c56" metalness={.23} roughness={.87}/>
   </mesh>
   <mesh position={[0,1.63,0]} castShadow>
    <sphereGeometry args={[.25,12,12]}/>
    <meshStandardMaterial color="#52645f" metalness={.24} roughness={.74}/>
   </mesh>
   <mesh position={[0,1.77,0]} castShadow>
    <sphereGeometry args={[.268,10,10,0,Math.PI*2,0,Math.PI*.54]}/>
    <meshStandardMaterial color="#252e31" metalness={.43} roughness={.6}/>
   </mesh>
   <mesh position={[0,1.59,-.22]}>
    <boxGeometry args={[.38,.15,.11]}/>
    <meshStandardMaterial color="#111c23" metalness={.5} roughness={.43}/>
   </mesh>
   {[-.28,.28].map(x=><group key={'limb'+x}>
    <mesh position={[x,1.05,-.02]} rotation={[.18,0,x>0?-.18:.18]} castShadow>
     <capsuleGeometry args={[.105,.38,5,8]}/>
     <meshStandardMaterial color="#55645c" metalness={.21} roughness={.84}/>
    </mesh>
    <mesh position={[x*.67,.39,.01]} castShadow>
     <capsuleGeometry args={[.145,.57,5,8]}/>
     <meshStandardMaterial color="#343f3e" metalness={.25} roughness={.83}/>
    </mesh>
   </group>)}
   <mesh position={[.18,1.19,-.40]} rotation={[.13,0,0]}>
    <boxGeometry args={[.18,.18,.96]}/>
    <meshStandardMaterial color="#19242a" metalness={.71} roughness={.45}/>
   </mesh>
   <mesh position={[0,1.08,.32]}>
    <boxGeometry args={[.63,.7,.16]}/>
    <meshStandardMaterial color="#3c514b" metalness={.28} roughness={.83}/>
   </mesh>
  </group>
  <group position={[0,player.crouch?1.44:2.23,0]}>
   <mesh position={[0,0,0]}>
    <boxGeometry args={[.98,.085,.11]}/>
    <meshBasicMaterial color="#17212b"/>
   </mesh>
   <mesh position={[-.49+.98*(player.hp/100)/2,0,.015]}>
    <boxGeometry args={[.98*(player.hp/100),.065,.12]}/>
    <meshBasicMaterial color={player.hp>30?'#69edb4':'#ff6d73'}/>
   </mesh>
  </group>
 </group>;
}

function createRifle(){
 const gun=new Group();
 const body=new MeshStandardMaterial({color:'#252b2d',roughness:.41,metalness:.68});
 const metal=new MeshStandardMaterial({color:'#454e50',roughness:.43,metalness:.75});
 const grip=new MeshStandardMaterial({color:'#11171b',roughness:.78,metalness:.25});
 const detail=new MeshStandardMaterial({color:'#a08c5b',roughness:.65,metalness:.44});
 const parts=[
  {p:[0,-.01,-.27],s:[.22,.25,.67],mat:body},
  {p:[0,.01,-.76],s:[.13,.14,.66],mat:metal},
  {p:[0,.04,-1.12],s:[.07,.06,.32],mat:body},
  {p:[0,.17,-.35],s:[.11,.07,.40],mat:detail},
  {p:[0,.23,-.49],s:[.06,.08,.08],mat:grip},
  {p:[.02,-.22,-.14],s:[.15,.39,.17],mat:grip},
  {p:[0,-.19,-.59],s:[.12,.16,.19],mat:grip},
  {p:[0,-.10,.18],s:[.21,.16,.42],mat:grip},
  {p:[0,.05,-1.3],s:[.12,.12,.06],mat:metal}
 ];
 for(const {p,s,mat} of parts){
  const item=new Mesh(new BoxGeometry(...s),mat);
  item.position.set(...p);item.castShadow=false;gun.add(item);
 }
 gun.position.set(.35,-.37,-.53);
 return gun;
}

function PlayerController({player,status,socket}){
 const {camera,gl,scene}=useThree();
 const target=useMemo(()=>new Vector3(),[]);
 const keys=useRef(new Set());
 const local=useRef({
  x:player.x,y:player.y??0,z:player.z,vy:player.vy??0,
  grounded:player.grounded!==false,crouch:!!player.crouch,jumpHeld:false
 });
 const yaw=useRef(player.yaw),pitch=useRef(player.pitch);
 const sendTimer=useRef(0),fireTimer=useRef(0),bob=useRef(0),recoil=useRef(0);
 const gun=useRef(null),firing=useRef(false),running=useRef(false);
 running.current=status==='playing'&&player.hp>0;
 useEffect(()=>{
  const dom=gl.domElement;
  const weapon=createRifle();
  gun.current=weapon;camera.add(weapon);scene.add(camera);
  const lock=()=>{if(running.current&&document.pointerLockElement!==dom)dom.requestPointerLock?.();};
  const move=e=>{
   if(document.pointerLockElement!==dom||!running.current)return;
   yaw.current-=e.movementX*.0022;
   pitch.current=Math.max(-1.42,Math.min(1.42,pitch.current-e.movementY*.0022));
  };
  const keyDown=e=>{
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
   if(e.repeat&&e.code==='KeyR')return;
   keys.current.add(e.code);
   if(e.code==='KeyR'&&running.current)socket.emit('player:reload');
  };
  const keyUp=e=>keys.current.delete(e.code);
  const mouseDown=e=>{
   if(e.button!==0||document.pointerLockElement!==dom||!running.current)return;
   firing.current=true;fireTimer.current=0;
   socket.emit('player:fire');
  };
  const mouseUp=e=>{if(e.button===0)firing.current=false;};
  const loseFocus=()=>{keys.current.clear();firing.current=false;};
  const pointerChange=()=>{if(document.pointerLockElement!==dom)loseFocus();};
  const onShot=event=>{if(event.shooterId===socket.id)recoil.current=1;};
  const onRespawn=data=>{
   yaw.current=data.yaw;pitch.current=0;recoil.current=0;
   keys.current.clear();
   if(Number.isFinite(data.x)&&Number.isFinite(data.y)&&Number.isFinite(data.z))
    local.current={x:data.x,y:data.y,z:data.z,vy:0,grounded:true,crouch:false,jumpHeld:false};
  };
  dom.addEventListener('click',lock);
  document.addEventListener('mousemove',move);
  document.addEventListener('keydown',keyDown);
  document.addEventListener('keyup',keyUp);
  document.addEventListener('mousedown',mouseDown);
  document.addEventListener('mouseup',mouseUp);
  document.addEventListener('pointerlockchange',pointerChange);
  window.addEventListener('blur',loseFocus);
  socket.on('match:shot',onShot);socket.on('player:respawn',onRespawn);
  return ()=>{
   dom.removeEventListener('click',lock);
   document.removeEventListener('mousemove',move);
   document.removeEventListener('keydown',keyDown);
   document.removeEventListener('keyup',keyUp);
   document.removeEventListener('mousedown',mouseDown);
   document.removeEventListener('mouseup',mouseUp);
   document.removeEventListener('pointerlockchange',pointerChange);
   window.removeEventListener('blur',loseFocus);
   socket.off('match:shot',onShot);socket.off('player:respawn',onRespawn);
   if(document.pointerLockElement===dom)document.exitPointerLock?.();
   camera.remove(weapon);scene.remove(camera);
   const materials=new Set();
   weapon.traverse(obj=>{if(obj.isMesh){obj.geometry.dispose();materials.add(obj.material);}});
   materials.forEach(m=>m.dispose());gun.current=null;
  };
 },[camera,gl,scene,socket]);
 useFrame((_,frameDelta)=>{
  const dt=Math.min(frameDelta,.05),keysNow=keys.current;
  const input={
   forward:Number(keysNow.has('KeyW')||keysNow.has('ArrowUp'))-Number(keysNow.has('KeyS')||keysNow.has('ArrowDown')),
   strafe:Number(keysNow.has('KeyD')||keysNow.has('ArrowRight'))-Number(keysNow.has('KeyA')||keysNow.has('ArrowLeft')),
   sprint:keysNow.has('ShiftLeft')||keysNow.has('ShiftRight'),
   jump:keysNow.has('Space'),
   crouch:keysNow.has('ControlLeft')||keysNow.has('ControlRight')||keysNow.has('KeyC'),
   yaw:yaw.current,pitch:pitch.current
  };
  if(running.current)local.current=movePlayer3D(local.current,input,dt);
  const predicted=local.current;
  const dx=player.x-predicted.x,dy=(player.y??0)-predicted.y,dz=player.z-predicted.z;
  if(dx*dx+dy*dy+dz*dz>16){
   // Large remote correction, e.g. respawn, must not move the camera through world geometry.
   predicted.x=player.x;predicted.y=player.y??0;predicted.z=player.z;predicted.vy=player.vy??0;
   predicted.grounded=player.grounded!==false;predicted.crouch=!!player.crouch;
  }else{
   const blend=smoothingFactor(dt,8);
   predicted.x+=dx*blend;predicted.y+=dy*blend;predicted.z+=dz*blend;
  }
  const walking=running.current&&(input.forward!==0||input.strafe!==0)&&predicted.grounded;
  if(walking)bob.current+=dt*(input.sprint?16:10);
  const motion=walking?Math.sin(bob.current)*(input.sprint?.055:.028):0;
  const eye=predicted.crouch?CROUCH_EYE:PLAYER_EYE;
  camera.position.lerp(target.set(predicted.x,predicted.y+eye+motion,predicted.z),smoothingFactor(dt,24));
  camera.rotation.set(pitch.current,yaw.current,0,'YXZ');
  recoil.current=Math.max(0,recoil.current-dt*7);
  if(gun.current){
   gun.current.position.set(.35+motion*.24,-.37+motion*.16,-.53+recoil.current*.14+(input.sprint?.07:0));
   gun.current.rotation.x=-recoil.current*.14+(input.sprint?-.08:0);
  }
  if(running.current&&firing.current){
   fireTimer.current+=dt;
   if(fireTimer.current>=.19){fireTimer.current=0;socket.emit('player:fire');}
  }
  sendTimer.current+=dt;
  if(sendTimer.current>=1/25){
   sendTimer.current=0;
   if(running.current)socket.emit('player:input',input);
  }
 });
 return null;
}
export default function GameScene({me,enemy,status,socket,quality='balanced'}){
 return <Canvas shadows={quality!=='low'} camera={CAMERA_CONFIG} dpr={QUALITY_DPR[quality]||QUALITY_DPR.balanced}>
  <FrontlineArena quality={quality}/>
  {enemy&&<Soldier player={enemy}/>}
  {me&&socket&&<PlayerController key={me.id} player={me} status={status} socket={socket}/>}
 </Canvas>;
}
