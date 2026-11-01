import {memo} from 'react';
import {ARENA_HALF,WORLD_BOXES} from '../../../../shared/rules.js';
import {resolveQuality} from '../../../config/renderQuality.js';

// IRON DEPOT: self-contained industrial 3D arena. Render objects share collision dimensions.
const MATERIALS={
 wall:{color:'#48515b',metalness:.12,roughness:.88},
 container:{color:'#526779',metalness:.48,roughness:.65},
 crate:{color:'#756650',metalness:.17,roughness:.85},
 barrier:{color:'#adb0aa',metalness:.14,roughness:.91},
 step:{color:'#5b656c',metalness:.39,roughness:.7},
 catwalk:{color:'#525f65',metalness:.68,roughness:.48},
 rail:{color:'#67777b',metalness:.71,roughness:.42},
 beam:{color:'#5e7577',metalness:.54,roughness:.52},
 support:{color:'#47545c',metalness:.52,roughness:.56}
};
function CargoBox({box:b,index}){
 const mat=MATERIALS[b.kind]||MATERIALS.wall;
 const isContainer=b.kind==='container',isStep=b.kind==='step';
 const ribCount=isContainer?Math.floor(b.w/.52):0;
 return <group position={[b.x,b.y,b.z]}>
  <mesh position={[0,b.h/2,0]} castShadow receiveShadow>
   <boxGeometry args={[b.w,b.h,b.d]}/>
   <meshStandardMaterial {...mat} color={isContainer&&index%2===0?'#666c68':mat.color}/>
  </mesh>
  {isContainer&&<>
   {Array.from({length:ribCount},(_,i)=>{
    const rx=-b.w/2+(i+.5)*(b.w/ribCount);
    return <group key={'rib'+i}>
     <mesh position={[rx,b.h/2,b.d/2+.022]}>
      <boxGeometry args={[.053,b.h-.16,.046]}/>
      <meshStandardMaterial color="#2d3c46" metalness={.75} roughness={.5}/>
     </mesh>
     <mesh position={[rx,b.h/2,-b.d/2-.022]}>
      <boxGeometry args={[.053,b.h-.16,.046]}/>
      <meshStandardMaterial color="#34434d" metalness={.74} roughness={.51}/>
     </mesh>
    </group>;
   })}
   <mesh position={[0,b.h-.16,b.d/2+.04]}>
    <boxGeometry args={[b.w-.16,.08,.052]}/><meshStandardMaterial color="#24333d" metalness={.7}/>
   </mesh>
   <mesh position={[0,b.h-.16,-b.d/2-.04]}>
    <boxGeometry args={[b.w-.16,.08,.052]}/><meshStandardMaterial color="#24333d" metalness={.7}/>
   </mesh>
  </>}
  {isStep&&<mesh position={[0,b.h+.013,0]}>
   <boxGeometry args={[b.w-.08,.025,b.d-.1]}/>
   <meshStandardMaterial color="#949b97" metalness={.47} roughness={.6}/>
  </mesh>}
  {b.kind==='catwalk'&&Array.from({length:12},(_,i)=>
   <mesh key={i} position={[-5.5+i,b.h+.017,0]}>
    <boxGeometry args={[.045,.028,b.d-.05]}/>
    <meshStandardMaterial color="#9b9a78" metalness={.72} roughness={.48}/>
   </mesh>
  )}
  {b.kind==='crate'&&<mesh position={[0,b.h+.025,0]}>
   <boxGeometry args={[b.w+.05,.05,b.d+.05]}/>
   <meshStandardMaterial color="#a19273" metalness={.2} roughness={.85}/>
  </mesh>}
  {b.kind==='barrier'&&Array.from({length:3},(_,i)=>
   <mesh key={i} position={[(i-1)*.88,b.h/2,b.d/2+.019]}>
    <boxGeometry args={[.42,.15,.04]}/>
    <meshStandardMaterial color={i%2===0?'#ddab4f':'#4e5154'} roughness={.8}/>
   </mesh>
  )}
 </group>;
}
function Floodlight({x,z,angle=0,quality}){
 return <group position={[x,0,z]} rotation={[0,angle,0]}>
  <mesh position={[0,3.4,0]} castShadow>
   <cylinderGeometry args={[.055,.075,6.8,7]}/>
   <meshStandardMaterial color="#62727d" metalness={.68} roughness={.5}/>
  </mesh>
  <mesh position={[0,6.7,-.38]} rotation={[-.4,0,0]} castShadow>
   <boxGeometry args={[1.55,.24,.65]}/>
   <meshStandardMaterial color="#273744" metalness={.7} roughness={.45}/>
  </mesh>
  {[-.48,0,.48].map(n=><mesh key={n} position={[n,6.63,-.73]} rotation={[-.4,0,0]}>
   <boxGeometry args={[.38,.18,.08]}/>
   <meshStandardMaterial color="#fff0cd" emissive="#e9c69d" emissiveIntensity={quality==='low'?.3:1.8}/>
  </mesh>)}
 </group>;
}
export const FrontlineArena=memo(function FrontlineArena({quality}){
 const preset=resolveQuality(quality);
 const shadow=preset.shadows;
 return <>
  <color attach="background" args={['#8b9aa4']}/>
  <fog attach="fog" args={['#8b9aa4',32,105]}/>
  <ambientLight intensity={.68}/>
  <hemisphereLight intensity={1.2} color="#e6f0fb" groundColor="#4e544d"/>
  <directionalLight position={[-19,29,13]} intensity={2.5} castShadow={shadow}
   shadow-mapSize={preset.shadowMapSize}
   shadow-camera-left={-27} shadow-camera-right={27}
   shadow-camera-top={27} shadow-camera-bottom={-27}
   shadow-bias={-.0002}/>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
   <planeGeometry args={[ARENA_HALF*2+1,ARENA_HALF*2+1]}/>
   <meshStandardMaterial color="#626a67" roughness={.96} metalness={.04}/>
  </mesh>
  {Array.from({length:11},(_,i)=>
   <group key={'floor'+i}>
    <mesh position={[0,.007,-20+i*4]} rotation={[-Math.PI/2,0,0]}>
     <planeGeometry args={[ARENA_HALF*2,.024]}/>
     <meshBasicMaterial color="#4b5959" transparent opacity={.5}/>
    </mesh>
    <mesh position={[-20+i*4,.009,0]} rotation={[-Math.PI/2,0,0]}>
     <planeGeometry args={[.024,ARENA_HALF*2]}/>
     <meshBasicMaterial color="#505b5c" transparent opacity={.42}/>
    </mesh>
   </group>
  )}
  {WORLD_BOXES.map((b,i)=><CargoBox key={i} box={b} index={i}/>)}
  {/* Ground safety stripes delineate the outer loop and central combat lane. */}
  {[-19,19].map(z=><mesh key={'paintz'+z} rotation={[-Math.PI/2,0,0]} position={[0,.018,z]}>
   <planeGeometry args={[35,.12]}/>
   <meshBasicMaterial color="#d3a44b" transparent opacity={.9}/>
  </mesh>)}
  {[-19,19].map(x=><mesh key={'paintx'+x} rotation={[-Math.PI/2,0,0]} position={[x,.018,0]}>
   <planeGeometry args={[.12,35]}/>
   <meshBasicMaterial color="#d3a44b" transparent opacity={.8}/>
  </mesh>)}
  <Floodlight x={-19} z={-2} angle={-Math.PI/2} quality={quality}/>
  <Floodlight x={19} z={2} angle={Math.PI/2} quality={quality}/>
  <mesh position={[0,5.6,-21.3]}>
   <boxGeometry args={[12,.55,.12]}/>
   <meshStandardMaterial color="#242e33" metalness={.6}/>
  </mesh>
  <mesh position={[0,5.6,-21.16]}>
   <boxGeometry args={[7.9,.22,.045]}/>
   <meshStandardMaterial color="#e6bc64" emissive="#76501c" emissiveIntensity={.3}/>
  </mesh>
 </>;
});
