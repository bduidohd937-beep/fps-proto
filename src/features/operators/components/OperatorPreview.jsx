import {memo,useMemo,useRef} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {resolveQuality} from '../../../config/renderQuality.js';
import {OPERATORS,DEFAULT_OPERATOR_ID} from '../../../../shared/operators.js';

function Operative({operatorId}){
 const group=useRef(null);
 const config=OPERATORS[operatorId]||OPERATORS[DEFAULT_OPERATOR_ID];
 const uniform=useMemo(()=>config.color,[config.color]);
 const trim=useMemo(()=>config.secondary,[config.secondary]);
 useFrame((state,delta)=>{
  if(!group.current)return;
  const elapsed=state.clock.elapsedTime;
  group.current.rotation.y+=(.12*Math.sin(elapsed*.45)-group.current.rotation.y)*Math.min(1,delta*2);
  group.current.position.y=.025*Math.sin(elapsed*1.65);
 });
 return <group ref={group} position={[0,-.03,0]} rotation={[0,-.16,0]}>
  {/* Boots and armored legs */}
  {[-.21,.21].map((x,i)=><group key={x}>
   <mesh castShadow position={[x,.42,0]}>
    <capsuleGeometry args={[.145,.51,6,10]}/>
    <meshStandardMaterial color="#384039" metalness={.14} roughness={.82}/>
   </mesh>
   <mesh castShadow position={[x,.12,-.13]}>
    <boxGeometry args={[.29,.22,.48]}/>
    <meshStandardMaterial color="#1c2728" metalness={.32} roughness={.7}/>
   </mesh>
   <mesh castShadow position={[x,1.06,0]} rotation={[0,0,i===0?.19:-.19]}>
    <capsuleGeometry args={[.16,.34,6,10]}/>
    <meshStandardMaterial color={uniform} metalness={.16} roughness={.8}/>
   </mesh>
  </group>)}
  {/* Chest armor and webbing */}
  <mesh castShadow position={[0,1.32,0]}>
   <boxGeometry args={[.91,.76,.49]}/>
   <meshStandardMaterial color={uniform} roughness={.79} metalness={.12}/>
  </mesh>
  <mesh castShadow position={[0,1.31,-.28]}>
   <boxGeometry args={[.79,.48,.14]}/>
   <meshStandardMaterial color={trim} metalness={.3} roughness={.74}/>
  </mesh>
  <mesh position={[0,1.42,-.37]}>
   <boxGeometry args={[.51,.12,.05]}/>
   <meshStandardMaterial color="#aa9770" metalness={.18}/>
  </mesh>
  {[-.25,0,.25].map(x=><mesh key={x} castShadow position={[x,1.2,-.4]}>
   <boxGeometry args={[.15,.27,.12]}/><meshStandardMaterial color="#28332d" roughness={.8}/>
  </mesh>)}
  <mesh castShadow position={[0,1.72,.2]}>
   <boxGeometry args={[.72,.32,.28]}/>
   <meshStandardMaterial color="#2b3735" roughness={.78}/>
  </mesh>
  {/* Helmet and shaded face visor */}
  <mesh castShadow position={[0,2.05,-.025]}>
   <sphereGeometry args={[.28,18,14]}/>
   <meshStandardMaterial color="#515c52" roughness={.75}/>
  </mesh>
  <mesh castShadow position={[0,2.18,.005]}>
   <sphereGeometry args={[.323,20,12,0,Math.PI*2,0,Math.PI*.55]}/>
   <meshStandardMaterial color={trim} metalness={.38} roughness={.58}/>
  </mesh>
  <mesh position={[0,2.035,-.251]}>
   <boxGeometry args={[.43,.13,.075]}/>
   <meshStandardMaterial color="#0d2228" metalness={.67} roughness={.34}/>
  </mesh>
  {/* Hands and rifle, should be visibly a military FPS operator */}
  {[-.55,.55].map((x,i)=><group key={x}>
   <mesh castShadow position={[x,1.37,-.28]} rotation={[.3,0,i?-.48:.48]}>
    <capsuleGeometry args={[.133,.48,6,8]}/>
    <meshStandardMaterial color={uniform} roughness={.83}/>
   </mesh>
   <mesh castShadow position={[x*.82,1.15,-.57]}>
    <boxGeometry args={[.19,.18,.27]}/>
    <meshStandardMaterial color="#272e2b" roughness={.86}/>
   </mesh>
  </group>)}
  <group position={[.12,1.14,-.77]} rotation={[0,-.20,-.04]}>
   <mesh castShadow>
    <boxGeometry args={[.23,.22,.92]}/>
    <meshStandardMaterial color="#1b2729" metalness={.68} roughness={.42}/>
   </mesh>
   <mesh position={[0,.02,-.74]}>
    <boxGeometry args={[.1,.13,.78]}/>
    <meshStandardMaterial color="#4b5452" metalness={.75} roughness={.4}/>
   </mesh>
   <mesh position={[0,.21,-.11]}>
    <boxGeometry args={[.16,.13,.32]}/>
    <meshStandardMaterial color="#2b393b" metalness={.6}/>
   </mesh>
   <mesh position={[.02,-.2,.12]}>
    <boxGeometry args={[.12,.36,.17]}/>
    <meshStandardMaterial color="#27302d" roughness={.85}/>
   </mesh>
  </group>
 </group>;
}
export const OperatorPreview=memo(function OperatorPreview({operatorId,quality='balanced'}){
 const preset=resolveQuality(quality);
 return <div className="operator-preview" aria-label="선택 오퍼레이터 3D 미리보기">
  <Canvas camera={{position:[2.6,1.6,4.55],fov:39,near:.1,far:30}} dpr={preset.dpr} shadows={false} frameloop="always">
   <color attach="background" args={['#101a1b']}/>
   <fog attach="fog" args={['#101a1b',7,16]}/>
   <ambientLight intensity={1.15}/>
   <hemisphereLight args={['#a7c1b6','#27332c',1.15]}/>
   <directionalLight position={[-3,7,4]} color="#c1d3c3" intensity={2.1}/>
   <pointLight position={[3,3,-1]} color="#c28e51" intensity={28} distance={9}/>
   <mesh position={[0,-.09,0]} rotation={[-Math.PI/2,0,0]}>
    <circleGeometry args={[3,48]}/>
    <meshStandardMaterial color="#25332f" metalness={.3} roughness={.9}/>
   </mesh>
   {Array.from({length:9},(_,i)=><mesh key={i} position={[i-4,-.08,0]} rotation={[-Math.PI/2,0,0]}>
    <planeGeometry args={[.022,5]}/>
    <meshBasicMaterial color="#526e64" transparent opacity={.14}/>
   </mesh>)}
   <Operative operatorId={operatorId}/>
  </Canvas>
  <div className="operator-preview-vignette"/>
  <div className="operator-preview-caption">PROJECT DUEL / FIELD OPERATIVE</div>
 </div>;
});
