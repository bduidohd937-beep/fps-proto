// FRONTLINE combat data shared by client display and authoritative server.
export const DEFAULT_WEAPON_ID='AR4';
export const WEAPON_IDS=Object.freeze(['AR4','VXR9','MKR12','BR7']);
export const WEAPONS=Object.freeze({
 AR4:Object.freeze({id:'AR4',name:'AR-4',category:'돌격소총',damage:25,headMultiplier:1.7,magazine:24,
  fireIntervalMs:175,reloadMs:1550,range:70,falloffStart:42,spreadHip:.019,spreadAds:.005,
  bloomPerShot:.12,adsFov:59,recoil:.14,automatic:true,accent:'#9bafaa'}),
 VXR9:Object.freeze({id:'VXR9',name:'VXR-9',category:'기관단총',damage:18,headMultiplier:1.55,magazine:36,
  fireIntervalMs:95,reloadMs:1320,range:45,falloffStart:24,spreadHip:.026,spreadAds:.010,
  bloomPerShot:.09,adsFov:64,recoil:.075,automatic:true,accent:'#91a3bf'}),
 MKR12:Object.freeze({id:'MKR12',name:'MKR-12',category:'저격소총',damage:76,headMultiplier:1.6,magazine:5,
  fireIntervalMs:1050,reloadMs:2400,range:105,falloffStart:80,spreadHip:.090,spreadAds:.001,
  bloomPerShot:.24,adsFov:28,recoil:.28,automatic:false,accent:'#c4ab7d'}),
 BR7:Object.freeze({id:'BR7',name:'BR-7',category:'전투소총',damage:36,headMultiplier:1.65,magazine:16,
  fireIntervalMs:260,reloadMs:1840,range:85,falloffStart:54,spreadHip:.028,spreadAds:.005,
  bloomPerShot:.16,adsFov:53,recoil:.18,automatic:false,accent:'#b2a3a2'})
});
export const getWeapon=id=>WEAPONS[id]??null;
export const createMagazines=()=>Object.fromEntries(WEAPON_IDS.map(id=>[id,WEAPONS[id].magazine]));
