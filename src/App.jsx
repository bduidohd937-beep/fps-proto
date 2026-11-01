import {useEffect,useRef,useState} from 'react';
import {io} from 'socket.io-client';
import {GameScene} from './features/combat/index.js';
import {MainMenu} from './features/lobby/index.js';
import {useBattleClock} from './features/match/index.js';
import {GAME_PROTOCOL,GAME_VERSION} from '../shared/version.js';
import {MAX_HP} from '../shared/rules.js';
import {WEAPON_IDS,WEAPONS,DEFAULT_WEAPON_ID} from '../shared/weapons.js';
import {DEFAULT_OPERATOR_ID,validOperator} from '../shared/operators.js';
import {SettingsPanel,loadSensitivity,saveSensitivity} from './features/settings/index.js';

export default function App(){
 const socketRef=useRef(null);
 const [operatorId,setOperatorId]=useState(()=>{
  try{return validOperator(window.localStorage.getItem('duel-operator'));}
  catch{return DEFAULT_OPERATOR_ID;}
 });
 const operatorRef=useRef(operatorId);
 const [connected,setConnected]=useState(false);
 const [myId,setMyId]=useState('');
 const [roomCode,setRoomCode]=useState('');
 const [typedCode,setTypedCode]=useState(()=>new URLSearchParams(window.location.search).get('room')?.toUpperCase()||'');
 const [match,setMatch]=useState(null);
 const [message,setMessage]=useState('');
 const [graphicsQuality,setGraphicsQuality]=useState('balanced');
 const [sensitivity,setSensitivity]=useState(loadSensitivity);
 const [settingsOpen,setSettingsOpen]=useState(false);
 const [networkPhase,setNetworkPhase]=useState('socket-init');
 const [roomPending,setRoomPending]=useState('');
 const [hitmarker,setHitmarker]=useState(false);
 const [headshot,setHeadshot]=useState(false);
 const [showDebug,setShowDebug]=useState(false);
 const [damageFlash,setDamageFlash]=useState(false);
 const lastHp=useRef(null);
 useEffect(()=>{
  const socket=io({reconnectionAttempts:10});socketRef.current=socket;
  let healthController=null;
  socket.on('connect',async ()=>{
   setNetworkPhase('socket-connected');
   setConnected(false);
   setMessage('PROJECT DUEL 서버 버전을 확인하고 있습니다...');
   healthController?.abort();
   const controller=new AbortController();healthController=controller;
   const timeout=setTimeout(()=>controller.abort(),5000);
   try{
    const response=await fetch('/api/health',{cache:'no-store',signal:controller.signal});
    const info=await response.json();
    if(controller.signal.aborted||healthController!==controller||!socket.connected)return;
    if(!response.ok||info.service!=='project-duel'||info.protocol!==GAME_PROTOCOL||info.version!==GAME_VERSION){
     setMessage('연결된 서버가 현재 게임 버전과 일치하지 않습니다. 기존 개발 서버를 종료한 후 npm run dev를 다시 실행해 주세요.');
     return;
    }
    if(!socket.connected||controller.signal.aborted)return;
    setConnected(true);setMessage('');
    setNetworkPhase('health-verified');
    socket.emit('operator:select',operatorRef.current,reply=>{
     if(reply&&!reply.ok)setMessage(reply.message||'오퍼레이터 선택에 실패했습니다.');
    });
   }catch{
    if(socket.connected&&healthController===controller)setMessage('게임 서버 상태 확인에 실패했습니다. 기존 서버를 종료하고 npm run dev를 다시 실행해 주세요.');
   }finally{
    clearTimeout(timeout);
   }
  });
  socket.on('connect_error',()=>{
   setNetworkPhase('socket-error');
   setConnected(false);setRoomPending('');
   setMessage('게임 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.');
  });
  socket.on('disconnect',()=>{
   setNetworkPhase('disconnected');
   healthController?.abort();healthController=null;
   setConnected(false);setMessage('서버 연결이 끊겼습니다. 재접속 중입니다.');
   setMatch(null);setRoomCode('');setMyId('');setRoomPending('');
  });
  socket.on('room:ready',({code,playerId})=>{
   setNetworkPhase('room-ready');
   setRoomCode(code);setMyId(playerId);lastHp.current=null;setMessage('');setRoomPending('');
  });
  socket.on('room:error',error=>{setRoomPending('');setMessage(error);});
  socket.on('room:message',setMessage);
  socket.on('match:state',state=>{setNetworkPhase(state.status==='playing'?'match-playing':`match-${state.status}`);setMatch(state);});
  socket.on('match:shot',({shooterId,targetId,zone})=>{
   if(shooterId===socket.id&&targetId){
    setHitmarker(true);
    setHeadshot(zone==='head');
    window.setTimeout(()=>setHitmarker(false),160);
    window.setTimeout(()=>setHeadshot(false),440);
   }
  });
  return ()=>{healthController?.abort();healthController=null;socket.disconnect();socketRef.current=null;};
 },[]);
 useEffect(()=>{
  const onDebug=e=>{if(e.code==='F3'){e.preventDefault();setShowDebug(x=>!x);}};
  window.addEventListener('keydown',onDebug);
  return ()=>window.removeEventListener('keydown',onDebug);
 },[]);
 const me=match?.players.find(p=>p.id===myId);
 const enemy=match?.players.find(p=>p.id!==myId);
 const now=useBattleClock({active:Boolean(roomCode&&match),reloadAt:me?.reloadAt,respawnAt:me?.respawnAt});
 useEffect(()=>{
  if(!me)return;
  if(lastHp.current!==null&&me.hp<lastHp.current){
   setDamageFlash(true);
   const timer=window.setTimeout(()=>setDamageFlash(false),240);
   lastHp.current=me.hp;
   return ()=>window.clearTimeout(timer);
  }
  lastHp.current=me.hp;
 },[me?.hp,me?.id]);
 const chooseOperator=id=>{
  const validated=validOperator(id);
  operatorRef.current=validated;
  setOperatorId(validated);
  try{window.localStorage.setItem('duel-operator',validated);}catch{}
  if(socketRef.current?.connected&&connected){
   socketRef.current.emit('operator:select',validated,reply=>{
    if(reply&&!reply.ok)setMessage(reply.message||'오퍼레이터를 바꿀 수 없습니다.');
   });
  }
 };
 const requestRoom=(action,code)=>{
  const socket=socketRef.current;
  if(!socket?.connected||!connected)return setMessage('PROJECT DUEL 서버 연결이 확인되지 않았습니다. 개발 서버를 재시작해 주세요.');
  if(roomPending)return;
  setRoomPending(action);
  setNetworkPhase(`room-${action}-requested`);
  setMessage(action==='solo'?'AI 대전 준비 중입니다...':action==='create'?'전장 생성 요청을 서버에 전송 중입니다...':'초대 코드 확인 및 입장 요청 중입니다...');
  const event=action==='solo'?'room:create-solo':action==='create'?'room:create':'room:join';
  const finish=(error,response)=>{
   setRoomPending('');
   if(error){
    setNetworkPhase(`room-${action}-timeout`);
    setMessage('서버에서 7초 동안 방 생성/입장 응답이 없습니다. 서버를 재시작하고 페이지를 새로고침해 주세요.');
    return;
   }
   if(!response?.ok){
    setNetworkPhase(`room-${action}-rejected`);
    setMessage(response?.message||'서버가 요청을 처리하지 못했습니다. 다시 시도해 주세요.');
    return;
   }
   if(!response.code||!response.playerId||!response.state){
    setNetworkPhase(`room-${action}-invalid`);
    setMessage('서버 응답에 방 정보가 부족합니다. 최신 서버 코드로 재시작해 주세요.');
    return;
   }
   setRoomCode(response.code);
   setNetworkPhase(`room-${action}-ack`);
   setMyId(response.playerId);
   setMatch(response.state);
   setMessage('');
  };
  if(action==='create')socket.timeout(7000).emit(event,finish);
  else if(action==='solo')socket.timeout(7000).emit(event,{difficulty:code},finish);
  else socket.timeout(7000).emit(event,code,finish);
 };
 const createRoom=()=>requestRoom('create');
 const startSolo=(difficulty='rookie')=>requestRoom('solo',difficulty);
 const joinRoom=e=>{
  e.preventDefault();
  const code=typedCode.replace(/[^A-Z0-9]/gi,'').toUpperCase();
  if(code.length!==6)return setMessage('초대 코드 6자리를 입력해 주세요.');
  requestRoom('join',code);
 };
 const leaveRoom=()=>{
  if(document.pointerLockElement)document.exitPointerLock?.();
  socketRef.current?.emit('room:leave');
  setRoomCode('');setMatch(null);setMyId('');setMessage('');
 };
 const copyInvite=async()=>{
  const url=new URL(window.location.href);url.searchParams.set('room',roomCode);
  try{
   await navigator.clipboard.writeText(url.toString());
   setMessage('초대 링크 복사 완료! 친구에게 보내 줘.');
  }catch{
   setMessage('복사가 차단됐습니다. 방 코드 '+roomCode+'를 친구에게 알려 주세요.');
  }
 };
 const restart=()=>socketRef.current?.emit('match:restart');
 const selectWeapon=id=>{
  if(!socketRef.current?.connected||!match||match.status!=='playing')return;
  socketRef.current.emit('player:select-weapon',id,reply=>{
   if(!reply?.ok)setMessage(reply?.message||'무기를 변경할 수 없습니다.');
  });
 };
 const alive=me&&me.hp>0, reloading=me&&me.reloadAt>now;
 const respawning=me&&me.hp<=0&&match?.status==='playing';
 const gameActive=roomCode&&me&&match;
 useEffect(()=>{
  const onEscape=e=>{
   if(e.key==='Escape'&&gameActive){e.preventDefault();setSettingsOpen(open=>!open);}
  };
  document.addEventListener('keydown',onEscape);
  return ()=>document.removeEventListener('keydown',onEscape);
 },[gameActive]);
 const won=match?.winnerId===myId;
 const weapon=WEAPONS[me?.weaponId]||WEAPONS[DEFAULT_WEAPON_ID];
 return <main className="app" data-network-phase={networkPhase}>
  <div className="ambient ambient-a"/><div className="ambient ambient-b"/>
  {!gameActive?<MainMenu connected={connected} pending={roomPending} message={message}
   typedCode={typedCode} onCodeChange={setTypedCode} onJoin={joinRoom} onCreate={createRoom}
   onSolo={startSolo} operatorId={operatorId} onOperatorChange={chooseOperator}
   quality={graphicsQuality} onQualityChange={setGraphicsQuality} sensitivity={sensitivity}
   onSensitivityChange={value=>setSensitivity(saveSensitivity(value))}/>:<section className="battle">
   <GameScene me={me} enemy={enemy} status={match.status} serverNow={match.serverNow} socket={socketRef.current} quality={graphicsQuality} sensitivity={sensitivity}/>
   <div className="battle-vignette"/>
   {damageFlash&&<div className="damage-flash"/>}
   <header className="battle-header">
    <div className="battle-brand">PROJECT <strong>DUEL</strong></div>
    <div className="scoreboard">
     <div className="score blue-score"><small>YOU</small><strong>{me.kills}</strong></div>
     <div className="score-mid"><span>FIRST TO {match.targetKills}</span><b>VS</b></div>
     <div className="score red-score"><strong>{enemy?.kills??0}</strong><small>{enemy?.bot?'BOT':'RIVAL'}</small></div>
    </div>
    <div className="room-label">{match.mode==='solo'?'SOLO / BOT':'ROOM'} <strong>{match.mode==='solo'?match.difficulty==='regular'?'정규병':'신병':roomCode}</strong>
     {match.mode!=='solo'&&<button className="text-button" onClick={copyInvite}>초대 링크</button>}
    </div>
   </header>
   {match.status==='playing'&&alive&&<div className={'crosshair '+(hitmarker?'hit ':'')+(me.ads?'ads':'')}>
    <span/><span/><span/><span/><i/>
   </div>}
   
   {headshot&&alive&&<div className="headshot-confirmation" role="status">HEADSHOT +</div>}
   {match.status==='playing'&&me&&<div className={'movement-status '+(showDebug?'':'debug-hidden')} aria-label="이동 상태">
    <span data-testid="stance">{me.prone?"엎드림":me.crouch?"앉기":me.grounded?"지상":"공중"}</span>
    <span data-testid="altitude" data-y={Number(me.y??0).toFixed(2)}>고도 {Number(me.y??0).toFixed(1)}m</span>
   </div>}
   <div className="loadout-bar" aria-label="무기 선택">
    {WEAPON_IDS.map((id,i)=><button key={id} type="button" disabled={match.status!=='playing'||!alive}
     className={'weapon-slot '+(weapon.id===id?'selected':'')}
     aria-label={WEAPONS[id].name+' 장착'}
     onClick={()=>selectWeapon(id)}>
      <span>{i+1}</span><strong>{WEAPONS[id].name}</strong><small>{WEAPONS[id].category}</small>
     </button>)}
   </div>
   <footer className="battle-hud">
    <div className="hud-module"><small>HEALTH</small>
     <div className="hp-text">{me.hp}<span> / {MAX_HP}</span></div>
     <div className="hp-track"><div style={{width:me.hp+'%'}}/></div>
    </div>
    <div className="hud-module ammo"><small>{weapon.name} / {weapon.category} / AMMO</small>
     <div className="ammo-value">{reloading?'RELOADING':me.ammo}
      <span>{reloading?'':' / '+weapon.magazine}</span>
     </div><div className="ammo-caption">{me.ads?'ADS 정조준 · ':''}R 장전 · 우클릭 정조준 · {weapon.automatic?'자동 연사':'단발 사격'}</div>
    </div>
   </footer>
   {message&&<div className="battle-notice" role="status">{message}</div>}
   {match.status==='waiting'&&<div className="modal-overlay"><div className="battle-modal">
    <div className="pane-kicker">WAITING FOR PLAYER 2</div>
    <h2>친구를 기다리는 중</h2><p>친구가 접속하면 자동으로 시작돼.</p>
    <div className="invite-code">{roomCode}</div>
    <button className="primary" onClick={copyInvite}>초대 링크 복사</button>
    <button className="secondary" onClick={()=>startSolo('rookie')} disabled={!!roomPending}>
     {roomPending==='solo'?'AI 전장 준비 중...':'친구 대신 AI와 바로 플레이'}
    </button>
    <button className="ghost" onClick={leaveRoom}>방 나가기</button>
   </div></div>}
   {respawning&&<div className="death-overlay"><div>ELIMINATED</div>
    <strong>{Math.max(0,(me.respawnAt-now)/1000).toFixed(1)}s</strong>
    <small>잠시 후 다시 전장에 투입됩니다</small>
   </div>}
   {match.status==='finished'&&<div className="modal-overlay"><div className="battle-modal">
    <div className="pane-kicker">MATCH COMPLETE</div>
    <h2 className={won?'win':'lose'}>{won?'VICTORY':'DEFEAT'}</h2>
    <p>{won?'축하해! 이번 결투의 승자야.':'아쉽지만 다음 판이 있어.'}</p>
    <div className="result-line">{me.kills} <span>:</span> {enemy?.kills??0}</div>
    <button className="primary" onClick={restart}>다시 대전</button>
    <button className="ghost" onClick={leaveRoom}>방 나가기</button>
   </div></div>}
   {settingsOpen&&<div className="modal-overlay settings-overlay" onMouseDown={e=>e.stopPropagation()}><SettingsPanel value={sensitivity}
    onChange={value=>setSensitivity(saveSensitivity(value))} onReset={value=>setSensitivity(saveSensitivity(value))}
    onClose={()=>setSettingsOpen(false)}/></div>}
  </section>}
 </main>;
}
