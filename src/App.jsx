import {useEffect,useRef,useState} from 'react';
import {io} from 'socket.io-client';
import GameScene from './components/GameScene.jsx';
import {MAX_HP,MAX_AMMO} from '../shared/rules.js';

export default function App(){
 const socketRef=useRef(null);
 const [connected,setConnected]=useState(false);
 const [myId,setMyId]=useState('');
 const [roomCode,setRoomCode]=useState('');
 const [typedCode,setTypedCode]=useState(()=>new URLSearchParams(window.location.search).get('room')?.toUpperCase()||'');
 const [match,setMatch]=useState(null);
 const [message,setMessage]=useState('');
 const [roomPending,setRoomPending]=useState('');
 const [hitmarker,setHitmarker]=useState(false);
 const [damageFlash,setDamageFlash]=useState(false);
 const [now,setNow]=useState(Date.now());
 const lastHp=useRef(null);
 useEffect(()=>{
  const socket=io({reconnectionAttempts:10});socketRef.current=socket;
  socket.on('connect',async ()=>{
   setConnected(false);
   setMessage('PROJECT DUEL 서버 버전을 확인하고 있습니다...');
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),5000);
   try{
    const response=await fetch('/api/health',{cache:'no-store',signal:controller.signal});
    const info=await response.json();
    if(!response.ok||info.service!=='project-duel'||info.protocol!==2){
     setMessage('연결된 서버가 PROJECT DUEL V0.1.2 서버가 아닙니다. 기존 개발 서버를 종료한 후 npm run dev를 다시 실행해 주세요.');
     return;
    }
    if(!socket.connected)return;
    setConnected(true);setMessage('');
   }catch{
    if(socket.connected)setMessage('게임 서버 상태 확인에 실패했습니다. 기존 서버를 종료하고 npm run dev를 다시 실행해 주세요.');
   }finally{
    clearTimeout(timeout);
   }
  });
  socket.on('connect_error',()=>{
   setConnected(false);setRoomPending('');
   setMessage('게임 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.');
  });
  socket.on('disconnect',()=>{
   setConnected(false);setMessage('서버 연결이 끊겼습니다. 재접속 중입니다.');
   setMatch(null);setRoomCode('');setMyId('');setRoomPending('');
  });
  socket.on('room:ready',({code,playerId})=>{
   setRoomCode(code);setMyId(playerId);lastHp.current=null;setMessage('');setRoomPending('');
  });
  socket.on('room:error',error=>{setRoomPending('');setMessage(error);});
  socket.on('room:message',setMessage);
  socket.on('match:state',setMatch);
  socket.on('match:shot',({shooterId,targetId})=>{
   if(shooterId===socket.id&&targetId){
    setHitmarker(true);window.setTimeout(()=>setHitmarker(false),160);
   }
  });
  return ()=>{socket.disconnect();socketRef.current=null;};
 },[]);
 const me=match?.players.find(p=>p.id===myId);
 const enemy=match?.players.find(p=>p.id!==myId);
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
 useEffect(()=>{
  const timer=window.setInterval(()=>setNow(Date.now()),100);
  return ()=>window.clearInterval(timer);
 },[]);
 const requestRoom=(action,code)=>{
  const socket=socketRef.current;
  if(!socket?.connected||!connected)return setMessage('PROJECT DUEL 서버 연결이 확인되지 않았습니다. 개발 서버를 재시작해 주세요.');
  if(roomPending)return;
  setRoomPending(action);
  setMessage(action==='create'?'전장 생성 요청을 서버에 전송 중입니다...':'초대 코드 확인 및 입장 요청 중입니다...');
  const event=action==='create'?'room:create':'room:join';
  const finish=(error,response)=>{
   setRoomPending('');
   if(error){
    setMessage('서버에서 7초 동안 방 생성/입장 응답이 없습니다. 서버를 재시작하고 페이지를 새로고침해 주세요.');
    return;
   }
   if(!response?.ok){
    setMessage(response?.message||'서버가 요청을 처리하지 못했습니다. 다시 시도해 주세요.');
    return;
   }
   if(!response.code||!response.playerId||!response.state){
    setMessage('서버 응답에 방 정보가 부족합니다. 최신 서버 코드로 재시작해 주세요.');
    return;
   }
   setRoomCode(response.code);
   setMyId(response.playerId);
   setMatch(response.state);
   setMessage('');
  };
  if(action==='create')socket.timeout(7000).emit(event,finish);
  else socket.timeout(7000).emit(event,code,finish);
 };
 const createRoom=()=>requestRoom('create');
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
 const alive=me&&me.hp>0, reloading=me&&me.reloadAt>now;
 const respawning=me&&me.hp<=0&&match?.status==='playing';
 const gameActive=roomCode&&me&&match;
 const won=match?.winnerId===myId;
 return <main className="app">
  <div className="ambient ambient-a"/><div className="ambient ambient-b"/>
  {!gameActive?<section className="lobby">
   <div className="eyebrow"><span className="live-dot"/> BROWSER ARENA · MULTIPLAYER · V0.1.2</div>
   <h1>PROJECT <span className="glow">DUEL</span></h1>
   <p className="subtitle">친구와 단둘이. 단 하나의 승자. 설치 없는 3D FPS.</p>
   <div className="lobby-grid">
    <div className="pane main-pane">
     <div className="pane-kicker">01 / HOST</div>
     <h2>새로운 전장 열기</h2>
     <p>방을 만들고 생성된 초대 코드를 친구에게 보내.</p>
     <button type="button" className="primary big" disabled={!connected||!!roomPending} onClick={createRoom}>{roomPending==='create'?'전장 생성 중...':'+ 전장 생성'}</button>
    </div>
    <form className="pane" onSubmit={joinRoom}>
     <div className="pane-kicker">02 / JOIN</div>
     <h2>친구 전장 참가</h2>
     <p>받은 6자리 코드를 입력하고 대전에 참여해.</p>
     <div className="join-row">
      <input aria-label="초대 코드" maxLength={6} value={typedCode}
       onChange={e=>setTypedCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))} placeholder="ABC123"/>
      <button className="secondary" disabled={!connected||!!roomPending} type="submit">{roomPending==='join'?'입장 중...':'입장'}</button>
     </div>
    </form>
   </div>
   <div className="instructions">
    <span><kbd>W A S D</kbd> 이동</span>
    <span><kbd>SHIFT</kbd> 달리기</span>
    <span><kbd>마우스</kbd> 조준 · 발사</span>
    <span><kbd>R</kbd> 장전</span>
    <span><kbd>ESC</kbd> 커서 해제</span>
   </div>
   <p className="connection"><span className={connected?'green-dot':'red-dot'}/>
    {connected?'게임 서버 연결됨':'서버 연결 중...'}</p>
   {message&&<div className="notice" role="status">{message}</div>}
  </section>:<section className="battle">
   <GameScene me={me} enemy={enemy} status={match.status} socket={socketRef.current}/>
   <div className="battle-vignette"/>
   {damageFlash&&<div className="damage-flash"/>}
   <header className="battle-header">
    <div className="battle-brand">PROJECT <strong>DUEL</strong></div>
    <div className="scoreboard">
     <div className="score blue-score"><small>YOU</small><strong>{me.kills}</strong></div>
     <div className="score-mid"><span>FIRST TO {match.targetKills}</span><b>VS</b></div>
     <div className="score red-score"><strong>{enemy?.kills??0}</strong><small>RIVAL</small></div>
    </div>
    <div className="room-label">ROOM <strong>{roomCode}</strong>
     <button className="text-button" onClick={copyInvite}>초대 링크</button>
    </div>
   </header>
   {match.status==='playing'&&alive&&<div className={'crosshair '+(hitmarker?'hit':'')}>
    <span/><span/><span/><span/><i/>
   </div>}
   {match.status==='playing'&&alive&&<div className="aim-hint">화면 클릭: 조준 · ESC: 커서 해제</div>}
   <footer className="battle-hud">
    <div className="hud-module"><small>HEALTH</small>
     <div className="hp-text">{me.hp}<span> / {MAX_HP}</span></div>
     <div className="hp-track"><div style={{width:me.hp+'%'}}/></div>
    </div>
    <div className="hud-module ammo"><small>ASSAULT RIFLE / AMMO</small>
     <div className="ammo-value">{reloading?'RELOADING':me.ammo}
      <span>{reloading?'':' / '+MAX_AMMO}</span>
     </div><div className="ammo-caption">R 장전 · 좌클릭 발사</div>
    </div>
   </footer>
   {message&&<div className="battle-notice" role="status">{message}</div>}
   {match.status==='waiting'&&<div className="modal-overlay"><div className="battle-modal">
    <div className="pane-kicker">WAITING FOR PLAYER 2</div>
    <h2>친구를 기다리는 중</h2><p>친구가 접속하면 자동으로 시작돼.</p>
    <div className="invite-code">{roomCode}</div>
    <button className="primary" onClick={copyInvite}>초대 링크 복사</button>
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
  </section>}
 </main>;
}
