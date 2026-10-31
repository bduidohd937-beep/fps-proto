import {memo,useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Vector3,Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import {ARENA_HALF,COVER,PLAYER_EYE,movePlayer} from '../../shared/rules.js';
import {smoothingFactor,shortestAngleDelta} from '../game/renderSmoothing.js';

const QUALITY_DPR={low:[.75,1],balanced:[1,1.25],high:[1,1.6]};
const CAMERA_CONFIG={fov:78,near:.06,far:90};
const SHADOW_MAP_STANDARD=[512,512],SHADOW_MAP_HIGH=[1024,1024];

const Arena=memo(function Arena({quality}){
 const wallHeight=5;
 const walls=[
  {pos:[0,wallHeight/2,-ARENA_HALF],size:[ARENA_HALF*2,wallHeight,.6]},
  {pos:[0,wallHeight/2,ARENA_HALF],size:[ARENA_HALF*2,wallHeight,.6]},
  {pos:[-ARENA_HALF,wallHeight/2,0],size:[.6,wallHeight,ARENA_HALF*2]},
  {pos:[ARENA_HALF,wallHeight/2,0],size:[.6,wallHeight,ARENA_HALF*2]}
 ];
 return <>
  <color attach="background" args={['#080f1e']}/>
  <fog attach="fog" args={['#080f1e',25,72]}/>
  <ambientLight intensity={1.3}/>
  <hemisphereLight intensity={1.4} groundColor="#182036"/>
  <directionalLight position={[8,22,11]} intensity={2.5} castShadow={quality!=='low'} shadow-mapSize={quality==='high'?SHADOW_MAP_HIGH:SHADOW_MAP_STANDARD}/>
  <pointLight position={[0,7,0]} color="#3ac6ef" intensity={45} distance={28}/>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
   <planeGeometry args={[ARENA_HALF*2,ARENA_HALF*2]}/>
   <meshStandardMaterial color="#18263b" roughness={.9}/>
  </mesh>
  <gridHelper args={[ARENA_HALF*2,36,'#23718b','#1c3f55']} position={[0,.01,0]}/>
  {walls.map((w,i)=><mesh key={i} position={w.pos} castShadow receiveShadow>
   <boxGeometry args={w.size}/><meshStandardMaterial color="#1c3048" metalness={.55} roughness={.65}/>
  </mesh>)}
  {COVER.map((c,i)=><group key={i} position={[c.x,0,c.z]}>
   <mesh position={[0,c.h/2,0]} castShadow receiveShadow>
    <boxGeometry args={[c.w,c.h,c.d]}/>
    <meshStandardMaterial color={i===0?'#2e4965':'#263b57'} metalness={.38} roughness={.66}/>
   </mesh>
   <mesh position={[0,c.h+.025,0]}>
    <boxGeometry args={[c.w+.02,.05,c.d+.02]}/>
    <meshStandardMaterial color="#39b6d1" emissive="#125e7b" emissiveIntensity={.5}/>
   </mesh>
  </group>)}
 </>;
});
function Opponent({player}){
 const visual=useRef(null);
 // Keep declarative props stable; otherwise React overrides useFrame interpolation every snapshot.
 const initialPose=useMemo(()=>({
  position:[player?.x??0,0,player?.z??0],
  rotation:[0,player?.yaw??0,0]
 }),[player?.id]);
 useFrame((_,delta)=>{
  const mesh=visual.current;
  if(!mesh||!player||player.hp<=0)return;
  const dx=player.x-mesh.position.x,dz=player.z-mesh.position.z;
  if(dx*dx+dz*dz>64){
   // Teleports and respawns should snap rather than cross the arena.
   mesh.position.set(player.x,0,player.z);
  }else{
   const blend=smoothingFactor(delta,18);
   mesh.position.x+=dx*blend;
   mesh.position.z+=dz*blend;
  }
  mesh.rotation.y+=shortestAngleDelta(mesh.rotation.y,player.yaw)*smoothingFactor(delta,18);
 });
 if(!player||player.hp<=0)return null;
 return <group ref={visual} position={initialPose.position} rotation={initialPose.rotation}>
  <mesh position={[0,.85,0]} castShadow>
   <capsuleGeometry args={[.37,.77,6,12]}/>
   <meshStandardMaterial color="#f05d69" metalness={.28} roughness={.5}/>
  </mesh>
  <mesh position={[0,1.63,0]} castShadow>
   <sphereGeometry args={[.27,14,14]}/>
   <meshStandardMaterial color="#d4e3ea" roughness={.42}/>
  </mesh>
  <mesh position={[0,1.62,-.18]}>
   <boxGeometry args={[.38,.13,.12]}/>
   <meshStandardMaterial color="#ff526a" emissive="#b91845" emissiveIntensity={1.1}/>
  </mesh>
  <mesh position={[.35,1.07,-.28]}>
   <boxGeometry args={[.12,.16,.83]}/>
   <meshStandardMaterial color="#132136" metalness={.6} roughness={.37}/>
  </mesh>
  <mesh position={[0,2.15,0]}>
   <boxGeometry args={[.95,.09,.11]}/>
   <meshBasicMaterial color="#101827"/>
  </mesh>
  <mesh position={[-.475+.95*(player.hp/100)/2,2.15,-.01]}>
   <boxGeometry args={[.95*(player.hp/100),.07,.115]}/>
   <meshBasicMaterial color={player.hp>30?'#5af2ac':'#fb6d6d'}/>
  </mesh>
 </group>;
}
function makeGun(){
 const group=new Group();
 const metal=new MeshStandardMaterial({color:'#202f44',roughness:.35,metalness:.72});
 const cyan=new MeshStandardMaterial({color:'#37b8d5',emissive:'#11657c',emissiveIntensity:1.1});
 const parts=[
  {p:[0,0,-.22],s:[.21,.23,.68],m:metal},
  {p:[0,.02,-.64],s:[.11,.13,.45],m:metal},
  {p:[0,.17,-.28],s:[.1,.08,.28],m:cyan},
  {p:[.02,-.20,-.06],s:[.12,.32,.16],m:metal},
  {p:[0,.05,-.91],s:[.07,.07,.26],m:cyan}
 ];
 parts.forEach(({p,s,m})=>{
  const mesh=new Mesh(new BoxGeometry(...s),m);
  mesh.position.set(...p);group.add(mesh);
 });
 group.position.set(.39,-.35,-.52);
 return group;
}
function Controller({player,status,socket}){
 const {camera,gl,scene}=useThree();
 const cameraTarget=useMemo(()=>new Vector3(),[]);
 const keys=useRef(new Set());
 const pos=useRef({x:player.x,z:player.z});
 const yaw=useRef(player.yaw),pitch=useRef(player.pitch);
 const sendAfter=useRef(0),recoil=useRef(0),gun=useRef(null);
 const runningRef=useRef(false);
 runningRef.current=status==='playing'&&player.hp>0;
 useEffect(()=>{
  const dom=gl.domElement,weapon=makeGun();
  gun.current=weapon;camera.add(weapon);scene.add(camera);
  const onClick=()=>{if(runningRef.current&&document.pointerLockElement!==dom)dom.requestPointerLock?.();};
  const onMove=e=>{
   if(document.pointerLockElement!==dom||!runningRef.current)return;
   yaw.current-=e.movementX*.0022;
   pitch.current=Math.max(-1.42,Math.min(1.42,pitch.current-e.movementY*.0022));
  };
  const onKeyDown=e=>{
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
   keys.current.add(e.code);
   if(e.code==='KeyR'&&runningRef.current)socket.emit('player:reload');
  };
  const onMouseDown=e=>{
   if(e.button===0&&document.pointerLockElement===dom&&runningRef.current)socket.emit('player:fire');
  };
  const onKeyUp=e=>keys.current.delete(e.code);
  const onBlur=()=>keys.current.clear();
  const onShot=data=>{if(data.shooterId===socket.id)recoil.current=1;};
  const onRespawn=data=>{yaw.current=data.yaw;pitch.current=0;};
  dom.addEventListener('click',onClick);
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mousedown',onMouseDown);
  document.addEventListener('keydown',onKeyDown);
  document.addEventListener('keyup',onKeyUp);
  window.addEventListener('blur',onBlur);
  socket.on('match:shot',onShot);socket.on('player:respawn',onRespawn);
  return ()=>{
   dom.removeEventListener('click',onClick);
   document.removeEventListener('mousemove',onMove);
   document.removeEventListener('mousedown',onMouseDown);
   document.removeEventListener('keydown',onKeyDown);
   document.removeEventListener('keyup',onKeyUp);
   window.removeEventListener('blur',onBlur);
   socket.off('match:shot',onShot);socket.off('player:respawn',onRespawn);
   if(document.pointerLockElement===dom)document.exitPointerLock?.();
   camera.remove(weapon);scene.remove(camera);
   const mats=new Set();
   weapon.traverse(obj=>{if(obj.isMesh){obj.geometry.dispose();mats.add(obj.material);}});
   mats.forEach(m=>m.dispose());gun.current=null;
  };
 },[camera,gl,scene,socket]);
 useFrame((_state,delta)=>{
  const dt=Math.min(delta,.05),k=keys.current;
  const input={
   forward:(k.has('KeyW')||k.has('ArrowUp')?1:0)-(k.has('KeyS')||k.has('ArrowDown')?1:0),
   strafe:(k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('ArrowLeft')?1:0),
   sprint:k.has('ShiftLeft')||k.has('ShiftRight'),yaw:yaw.current,pitch:pitch.current
  };
  if(runningRef.current)pos.current=movePlayer(pos.current,input,dt);
  const sync=Math.min(1,dt*9);
  pos.current.x+=(player.x-pos.current.x)*sync;
  pos.current.z+=(player.z-pos.current.z)*sync;
  camera.position.lerp(cameraTarget.set(pos.current.x,PLAYER_EYE,pos.current.z),Math.min(1,dt*24));
  camera.rotation.set(pitch.current,yaw.current,0,'YXZ');
  if(gun.current){
   recoil.current=Math.max(0,recoil.current-dt*8);
   gun.current.position.z=-.52+recoil.current*.13;
   gun.current.rotation.x=-recoil.current*.16;
  }
  sendAfter.current+=dt;
  if(sendAfter.current>=1/25){sendAfter.current=0;if(runningRef.current)socket.emit('player:input',input);}
 });
 return null;
}
export default function GameScene({me,enemy,status,socket,quality='balanced'}){
 const pixelRatio=QUALITY_DPR[quality]||QUALITY_DPR.balanced;
 return <Canvas shadows={quality!=='low'} camera={CAMERA_CONFIG} dpr={pixelRatio}>
  <Arena quality={quality}/>
  {enemy&&<Opponent player={enemy}/>}
  {me&&socket&&<Controller key={me.id} player={me} status={status} socket={socket}/>}
 </Canvas>;
}
