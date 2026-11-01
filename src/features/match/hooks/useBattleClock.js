import {useEffect,useState} from 'react';

// Only run a 100ms UI clock while a reload/respawn countdown needs it.
// The previous global interval needlessly re-rendered the entire lobby 10x/sec.
export function useBattleClock({active,reloadAt=0,respawnAt=0}){
 const [now,setNow]=useState(()=>Date.now());
 const countdownActive=Boolean(active && (reloadAt>Date.now() || respawnAt>Date.now()));
 useEffect(()=>{
  if(!countdownActive)return undefined;
  const tick=()=>setNow(Date.now());
  tick();
  const timer=window.setInterval(tick,100);
  return ()=>window.clearInterval(timer);
 },[countdownActive]);
 return now;
}
