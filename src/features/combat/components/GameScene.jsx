import {useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Vector3,Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import {PLAYER_EYE,CROUCH_EYE,PRONE_EYE,movePlayer3D} from '../../../../shared/rules.js';
import {smoothingFactor,shortestAngleDelta} from '../utils/renderSmoothing.js';
import {FrontlineArena} from '../../arena/index.js';
import {CAMERA_CONFIG,resolveQuality} from '../../../config/renderQuality.js';
import {DEFAULT_WEAPON_ID,WEAPONS,WEAPON_IDS} from '../../../../shared/weapons.js';
import {OPERATORS,DEFAULT_OPERATOR_ID} from '../../../../shared/operators.js';
import {getVisualKick} from '../../../../shared/recoil.js';



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
 const crouchScale=player.crouch?0.67:1;
 const uniform=OPERATORS[player.operatorId]?.color||OPERATORS[DEFAULT_OPERATOR_ID].color;
 if(player.prone)return <group ref={visual} position={origin.position} rotation={origin.rotation}>
  <mesh castShadow position={[0,.29,0]} rotation={[-Math.PI/2,0,0]}>
   <capsuleGeometry args={[.28,.66,6,10]}/>
   <meshStandardMaterial color={uniform} metalness={.18} roughness={.86}/>
  </mesh>
  <mesh castShadow position={[0,.34,-.61]}>
   <sphereGeometry args={[.21,12,12]}/>
   <meshStandardMaterial color="#3a4744" metalness={.28} roughness={.78}/>
  </mesh>
  {[-.22,.22].map(x=><mesh key={x} castShadow position={[x,.20,.61]}>
   <boxGeometry args={[.23,.25,.63]}/>
   <meshStandardMaterial color="#252e2c" roughness={.82}/>
  </mesh>)}
  <mesh position={[.15,.32,-.52]}>
   <boxGeometry args={[.16,.14,.83]}/>
   <meshStandardMaterial color="#1a272b" metalness={.65} roughness={.46}/>
  </mesh>
  <mesh position={[0,.86,0]}>
   <boxGeometry args={[.85,.065,.1]}/><meshBasicMaterial color={player.hp>30?'#66dfaa':'#e96b66'}/>
  </mesh>
 </group>;
 return <group ref={visual} position={origin.position} rotation={origin.rotation}>
  <group scale={[1,crouchScale,1]}>
   <mesh position={[0,1.03,0]} castShadow>
    <capsuleGeometry args={[.34,.53,6,10]}/>
    <meshStandardMaterial color={uniform} metalness={.23} roughness={.87}/>
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
     <meshStandardMaterial color={uniform} metalness={.21} roughness={.84}/>
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

function createRifle(weaponId){
 const weapon=WEAPONS[weaponId]||WEAPONS[DEFAULT_WEAPON_ID];
 const isSmg=weaponId==='VXR9',isSniper=weaponId==='MKR12',isBattle=weaponId==='BR7';
 const barrelLength=isSniper?1.18:isSmg?.48:isBattle?.82:.68;
 const gun=new Group();
 const body=new MeshStandardMaterial({color:'#252b2d',roughness:.41,metalness:.68});
 const metal=new MeshStandardMaterial({color:'#454e50',roughness:.43,metalness:.75});
 const grip=new MeshStandardMaterial({color:'#11171b',roughness:.78,metalness:.25});
 const detail=new MeshStandardMaterial({color:weapon.accent,roughness:.65,metalness:.44});
 const parts=[
  {p:[0,-.01,-.27],s:[isBattle?.25:.22,.25,isSniper?.84:.67],mat:body},
  {p:[0,.01,-.64],s:[.13,.14,barrelLength],mat:metal},
  {p:[0,.04,-.92-barrelLength/2],s:[.07,.06,.3],mat:body},
  {p:[0,.17,-.35],s:[.11,.07,isSniper?.52:.4],mat:detail},
  {p:[0,.23,-.49],s:[.06,.08,.08],mat:grip},
  {p:[.02,-.22,-.14],s:[.15,isSmg?.25:.39,.17],mat:grip},
  {p:[0,-.19,-.59],s:[.12,.16,.19],mat:grip},
  {p:[0,-.10,.18],s:[.21,.16,.42],mat:grip},
  {p:[0,.05,-1.07-barrelLength/2],s:[.12,.12,.06],mat:metal}
 ];
 if(isSniper)parts.push({p:[0,.30,-.56],s:[.19,.16,.63],mat:body});
 if(isBattle)parts.push({p:[0,-.08,-.96],s:[.17,.14,.28],mat:detail});
 for(const {p,s,mat} of parts){
  const item=new Mesh(new BoxGeometry(...s),mat);
  item.position.set(...p);item.castShadow=false;gun.add(item);
 }
 gun.position.set(.35,-.37,-.53);
 return gun;
}
function disposeRifle(weapon){
 if(!weapon)return;
 const materials=new Set();
 weapon.traverse(obj=>{if(obj.isMesh){obj.geometry.dispose();materials.add(obj.material);}});
 materials.forEach(material=>material.dispose());
}
function PlayerController({player,status,socket}){
 const {camera,gl,scene}=useThree();
 const target=useMemo(()=>new Vector3(),[]);
 const keys=useRef(new Set());
 const local=useRef({
  x:player.x,y:player.y??0,z:player.z,vy:player.vy??0,
  grounded:player.grounded!==false,crouch:!!player.crouch,prone:!!player.prone,jumpHeld:false
 });
 const yaw=useRef(player.yaw),pitch=useRef(player.pitch);
 const sendTimer=useRef(0),fireTimer=useRef(0),bob=useRef(0),recoil=useRef(0);
 const gun=useRef(null),firing=useRef(false),aimHeld=useRef(false),viewAds=useRef(0),running=useRef(false),proneToggle=useRef(false);
 const visibleWeapon=useRef(player.weaponId||DEFAULT_WEAPON_ID);
 running.current=status==='playing'&&player.hp>0;
 useEffect(()=>{
  const dom=gl.domElement;
  const weapon=createRifle(visibleWeapon.current);
  gun.current=weapon;camera.add(weapon);scene.add(camera);
  const lock=()=>{if(running.current&&document.pointerLockElement!==dom)dom.requestPointerLock?.();};
  const move=e=>{
   if(document.pointerLockElement!==dom||!running.current)return;
   yaw.current-=e.movementX*.0022;
   pitch.current=Math.max(-1.42,Math.min(1.42,pitch.current-e.movementY*.0022));
  };
  const keyDown=e=>{
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
   if(e.repeat&&(/^(Digit[1-4]|KeyR|KeyZ)$/.test(e.code)))return;
   keys.current.add(e.code);
   if(e.code==='KeyZ'&&running.current)proneToggle.current=!proneToggle.current;
   if(!running.current)return;
   if(e.code==='KeyR')socket.emit('player:reload');
   const match=e.code.match(/^Digit([1-4])$/);
   if(match){
    const selected=WEAPON_IDS[Number(match[1])-1];
    if(selected)socket.emit('player:select-weapon',selected);
   }
  };
  const keyUp=e=>keys.current.delete(e.code);
  const mouseDown=e=>{
   if(document.pointerLockElement!==dom||!running.current)return;
   if(e.button===2){e.preventDefault();aimHeld.current=true;return;}
   if(e.button!==0)return;
   firing.current=true;fireTimer.current=0;
   socket.emit('player:fire');
  };
  const mouseUp=e=>{
   if(e.button===0)firing.current=false;
   if(e.button===2)aimHeld.current=false;
  };
  const contextMenu=e=>{if(document.pointerLockElement===dom)e.preventDefault();};
  const loseFocus=()=>{keys.current.clear();firing.current=false;aimHeld.current=false;};
  const pointerChange=()=>{if(document.pointerLockElement!==dom)loseFocus();};
  const onShot=event=>{
   if(event.shooterId!==socket.id)return;
   const current=WEAPONS[event.weaponId]||WEAPONS[DEFAULT_WEAPON_ID];
   recoil.current=1;
   const kick=getVisualKick(current,event.recoilIndex??0,event.stance??'standing');
   pitch.current=Math.min(1.42,pitch.current+kick.pitch);
   yaw.current-=kick.yaw;
  };
  const onRespawn=data=>{
   yaw.current=data.yaw;pitch.current=0;recoil.current=0;
   proneToggle.current=false;
   keys.current.clear();aimHeld.current=false;firing.current=false;
   if(Number.isFinite(data.x)&&Number.isFinite(data.y)&&Number.isFinite(data.z))
    local.current={x:data.x,y:data.y,z:data.z,vy:0,grounded:true,crouch:false,prone:false,jumpHeld:false};
  };
  dom.addEventListener('click',lock);
  document.addEventListener('mousemove',move);
  document.addEventListener('keydown',keyDown);
  document.addEventListener('keyup',keyUp);
  document.addEventListener('mousedown',mouseDown);
  document.addEventListener('mouseup',mouseUp);
  dom.addEventListener('contextmenu',contextMenu);
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
   dom.removeEventListener('contextmenu',contextMenu);
   document.removeEventListener('pointerlockchange',pointerChange);
   window.removeEventListener('blur',loseFocus);
   socket.off('match:shot',onShot);socket.off('player:respawn',onRespawn);
   if(document.pointerLockElement===dom)document.exitPointerLock?.();
   camera.remove(gun.current);scene.remove(camera);
   disposeRifle(gun.current);gun.current=null;
  };
 },[camera,gl,scene,socket]);
 useFrame((_,frameDelta)=>{
  const dt=Math.min(frameDelta,.05),keysNow=keys.current;
  const playerWeapon=WEAPONS[player.weaponId]||WEAPONS[DEFAULT_WEAPON_ID];
  if(visibleWeapon.current!==playerWeapon.id){
   camera.remove(gun.current);disposeRifle(gun.current);
   gun.current=createRifle(playerWeapon.id);camera.add(gun.current);
   visibleWeapon.current=playerWeapon.id;
   fireTimer.current=0;firing.current=false;
  }
  const ads=aimHeld.current&&!(keysNow.has('ShiftLeft')||keysNow.has('ShiftRight'));
  const input={
   forward:Number(keysNow.has('KeyW')||keysNow.has('ArrowUp'))-Number(keysNow.has('KeyS')||keysNow.has('ArrowDown')),
   strafe:Number(keysNow.has('KeyD')||keysNow.has('ArrowRight'))-Number(keysNow.has('KeyA')||keysNow.has('ArrowLeft')),
   sprint:(keysNow.has('ShiftLeft')||keysNow.has('ShiftRight'))&&!ads,
   ads,
   jump:keysNow.has('Space'),
   crouch:!proneToggle.current&&(keysNow.has('ControlLeft')||keysNow.has('ControlRight')||keysNow.has('KeyC')),
   prone:proneToggle.current,
   yaw:yaw.current,pitch:pitch.current
  };
  if(running.current)local.current=movePlayer3D(local.current,input,dt);
  const predicted=local.current;
  const dx=player.x-predicted.x,dy=(player.y??0)-predicted.y,dz=player.z-predicted.z;
  if(dx*dx+dy*dy+dz*dz>16){
   // Large remote correction, e.g. respawn, must not move the camera through world geometry.
   predicted.x=player.x;predicted.y=player.y??0;predicted.z=player.z;predicted.vy=player.vy??0;
   predicted.grounded=player.grounded!==false;predicted.crouch=!!player.crouch;predicted.prone=!!player.prone;
  }else{
   const blend=smoothingFactor(dt,8);
   predicted.x+=dx*blend;predicted.y+=dy*blend;predicted.z+=dz*blend;
  }
  const walking=running.current&&(input.forward!==0||input.strafe!==0)&&predicted.grounded;
  if(walking)bob.current+=dt*(predicted.prone?4:input.sprint?16:input.crouch?7:10);
  const motion=walking?Math.sin(bob.current)*(predicted.prone?.006:input.sprint?.055:input.crouch?.014:.028):0;
  const eye=predicted.prone?PRONE_EYE:predicted.crouch?CROUCH_EYE:PLAYER_EYE;
  camera.position.lerp(target.set(predicted.x,predicted.y+eye+motion,predicted.z),smoothingFactor(dt,24));
  camera.rotation.set(pitch.current,yaw.current,0,'YXZ');
  recoil.current=Math.max(0,recoil.current-dt*7);
  viewAds.current+=(Number(ads)-viewAds.current)*smoothingFactor(dt,12);
  const zoom=viewAds.current;
  const fov=78+(playerWeapon.adsFov-78)*zoom;
  if(Math.abs(camera.fov-fov)>.025){camera.fov=fov;camera.updateProjectionMatrix();}
  if(gun.current){
   gun.current.position.set(
    .35+motion*.24+(-.305-motion*.24)*zoom,
    -.37+motion*.16+(.13-motion*.16)*zoom+(predicted.prone?.09:0),
    -.53+recoil.current*.14+(input.sprint?.07:0)+.12*zoom
   );
   gun.current.rotation.x=-recoil.current*playerWeapon.recoil+(input.sprint?-.08:0);
  }
  if(running.current&&firing.current&&playerWeapon.automatic){
   fireTimer.current+=dt;
   if(fireTimer.current>=playerWeapon.fireIntervalMs/1000){
    fireTimer.current=0;socket.emit('player:fire');
   }
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
 const preset=resolveQuality(quality);
 return <Canvas shadows={preset.shadows} camera={CAMERA_CONFIG} dpr={preset.dpr}>
  <FrontlineArena quality={quality}/>
  {enemy&&<Soldier player={enemy}/>}
  {me&&socket&&<PlayerController key={me.id} player={me} status={status} socket={socket}/>}
 </Canvas>;
}
