import './dueltics-lobby-v2a.css';
import {useEffect,useState} from 'react';
import {GraphicsQualitySelect} from './GraphicsQualitySelect.jsx';
import {OPERATOR_IDS,OPERATORS} from '../../../../shared/operators.js';
import {GAME_VERSION} from '../../../../shared/version.js';
import {WEAPON_IDS,WEAPONS} from '../../../../shared/weapons.js';
import {SettingsPanel} from '../../settings/index.js';

// V2-A is presentation-only. Room lifecycle, purchases, combat state and operator
// validation remain with App and the authoritative server.
const UI_ASSETS=`${import.meta.env.BASE_URL}assets/ui/dueltics/`;
const OPERATOR_ART={
 'ghost':{portrait:'ghost-portrait.webp',lineup:'ghost-lineup.webp',country:'브라질',flag:'🇧🇷',realName:'마테우스 코스타',specialty:'정찰 · 기동 · 교란',signature:'VXR-9'},
 'iron-wolf':{portrait:'iron-wolf-portrait.webp',lineup:'iron-wolf-lineup.webp',country:'대한민국',flag:'🇰🇷',realName:'강도윤',specialty:'돌격 · 제압 · 화력 운용',signature:'AR-4'},
 'bulwark':{portrait:'bulwark-portrait.webp',lineup:'bulwark-lineup.webp',country:'폴란드',flag:'🇵🇱',realName:'마테우시 코발스키',specialty:'지원 · 화력 지원 · 전선 유지',signature:'BR-7'},
 'hawkeye':{portrait:'hawkeye-portrait.webp',lineup:'hawkeye-lineup.webp',country:'캐나다',flag:'🇨🇦',realName:'에블린 모건',specialty:'저격 · 정밀 사격',signature:'MKR-12'}
};
const SQUAD_ORDER=['ghost','iron-wolf','bulwark','hawkeye'];
const NAV=[
 {id:'play',ko:'플레이',en:'PLAY',glyph:'▶'},
 {id:'operators',ko:'오퍼레이터',en:'OPERATORS',glyph:'◈'},
 {id:'armory',ko:'무기고',en:'ARMORY',glyph:'⌖'},
 {id:'record',ko:'전투 기록',en:'RECORD',glyph:'▥'},
 {id:'settings',ko:'설정',en:'SETTINGS',glyph:'⚙'}
];
const GROUPS=[
 {id:'melee',shortcut:'1',title:'근접무기',en:'MELEE'},
 {id:'secondary',shortcut:'2',title:'보조무기',en:'SECONDARY'},
 {id:'primary',shortcut:'3',title:'주무기',en:'PRIMARY'}
];
function groupOfWeapon(weapon){return weapon?.category==='권총'?'secondary':'primary';}
function OperatorPortrait({id,className='',decorative=false}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[id]);
 return <span className={'dl-portrait '+className}>
  {!failed?<img src={UI_ASSETS+OPERATOR_ART[id].portrait} alt={decorative?'':OPERATORS[id].name+' 초상화'} onError={()=>setFailed(true)} loading="lazy"/>:
   <span className="dl-portrait-fallback" aria-hidden="true">{OPERATORS[id].name.slice(0,1)}</span>}
 </span>;
}
function OperatorDetail({operatorId,onOperatorChange}){
 const selected=OPERATORS[operatorId]||OPERATORS[OPERATOR_IDS[0]];
 const art=OPERATOR_ART[selected.id];
 const [imageError,setImageError]=useState(false);
 useEffect(()=>setImageError(false),[selected.id]);
 return <div className="dl-detail dl-operators">
  <div className="dl-panel-eyebrow">FTG / PERSONNEL DIRECTORY</div>
  <div className="dl-panel-heading"><h2>OPERATORS</h2><span>01 — 04</span></div>
  <p className="dl-muted">캐릭터의 외형과 프로필을 선택해. 현재 전투 능력치는 모두 같아.</p>
  <div className="dl-op-tiles" role="group" aria-label="오퍼레이터 선택">
   {SQUAD_ORDER.map(id=><button key={id} type="button" className={'dl-op-tile '+(operatorId===id?'is-selected':'')}
    onClick={()=>onOperatorChange(id)} aria-pressed={operatorId===id}>
    <OperatorPortrait id={id} decorative/>
    <span>{OPERATORS[id].name}</span>
   </button>)}
  </div>
  <div className="dl-op-profile">
   <div className="dl-op-gallery">
    {!imageError?<img key={selected.id} src={UI_ASSETS+art.lineup} alt={selected.name+' 정면, 측면, 후면 2D 디자인'} onError={()=>setImageError(true)}/>:
     <OperatorPortrait id={selected.id} className="dl-op-gallery-fallback"/>}
    <span className="dl-gallery-note">2D CONCEPT ART · FRONT / SIDE / BACK</span>
   </div>
   <div className="dl-op-info">
    <span className="dl-panel-eyebrow">ACTIVE OPERATOR</span>
    <h3>{selected.name}</h3>
    <div className="dl-op-nationality">{art.flag} {art.country} <span>· FTG</span></div>
    <dl>
     <div><dt>본명</dt><dd>{art.realName}</dd></div>
     <div><dt>전문</dt><dd>{art.specialty}</dd></div>
     <div><dt>대표 무기</dt><dd>{art.signature}</dd></div>
    </dl>
    <p>{selected.description}</p>
    <p className="dl-note">현재 캐릭터는 외형 선택이며 고유 전투 능력은 적용되지 않아.</p>
   </div>
  </div>
 </div>;
}
function ArmoryDetail(){
 const [group,setGroup]=useState('primary');
 const weapons=WEAPON_IDS.filter(id=>groupOfWeapon(WEAPONS[id])===group);
 const [weaponId,setWeaponId]=useState('AR4');
 const chosen=weapons.includes(weaponId)?weaponId:weapons[0];
 const weapon=chosen?WEAPONS[chosen]:null;
 return <div className="dl-detail dl-armory">
  <div className="dl-panel-eyebrow">FTG / EQUIPMENT DATABASE</div>
  <div className="dl-panel-heading"><h2>ARMORY</h2><span>CATALOG / PREVIEW</span></div>
  <p className="dl-muted">무기 데이터 열람 화면이야. 전투 중 B키 상점이나 실제 장착·구매 기능과는 별개야.</p>
  <div className="dl-armory-tabs" role="group" aria-label="무기 분류">
   {GROUPS.map(g=><button key={g.id} type="button" className={group===g.id?'is-selected':''} onClick={()=>setGroup(g.id)} aria-pressed={group===g.id}>
    <span className="dl-key">{g.shortcut}</span>{g.title}<small>{g.en}</small>
   </button>)}
  </div>
  {group==='melee'?<div className="dl-armory-empty">
   <strong>MELEE / 준비 중</strong><p>전술 나이프와 도끼는 후보 에셋만 있어. 현재 공유 무기 데이터에는 근접무기가 없어 실제 장착을 제공하지 않아.</p>
  </div>:<div className="dl-armory-body">
   <div className="dl-weapon-list" role="group" aria-label="무기 목록">
    {weapons.map(id=><button type="button" key={id} onClick={()=>setWeaponId(id)} className={chosen===id?'is-selected':''} aria-pressed={chosen===id}>
     <span>{WEAPONS[id].name}</span><small>{WEAPONS[id].category}</small>
    </button>)}
   </div>
   {weapon&&<div className="dl-weapon-card" aria-live="polite">
    <span className="dl-panel-eyebrow">WEAPON DATA / {weapon.category}</span>
    <h3>{weapon.name}</h3>
    <div className="dl-weapon-emblem" aria-hidden="true">⌖</div>
    <dl className="dl-weapon-stats">
     <div><dt>기본 피해</dt><dd>{weapon.damage}</dd></div>
     <div><dt>탄창</dt><dd>{weapon.magazine}발</dd></div>
     <div><dt>최대 사거리</dt><dd>{weapon.range}m</dd></div>
     <div><dt>사격 방식</dt><dd>{weapon.automatic?'자동':'단발'}</dd></div>
    </dl>
    <p className="dl-note">수치는 업로드된 공유 무기 데이터 기준. 3D 무기 미리보기·구매 기능은 아직 연결되지 않았어.</p>
   </div>}
  </div>}
 </div>;
}
function PlayDetail({connected,pending,typedCode,onCodeChange,onJoin,onCreate,onSolo}){
 const [mode,setMode]=useState(()=>new URLSearchParams(window.location.search).has('room')?'private':'solo');
 const [difficulty,setDifficulty]=useState('rookie');
 return <div className="dl-detail dl-play">
  <div className="dl-panel-eyebrow">OPERATION CONTROL / DEPLOYMENT</div>
  <div className="dl-panel-heading"><h2>DEPLOY</h2><span>SELECT MISSION</span></div>
  <div className="dl-modes" role="group" aria-label="게임 모드">
   <button type="button" onClick={()=>setMode('solo')} aria-pressed={mode==='solo'} className={mode==='solo'?'is-selected':''}>01 <b>솔로 AI전</b><small>SOLO / BOT</small></button>
   <button type="button" onClick={()=>setMode('private')} aria-pressed={mode==='private'} className={mode==='private'?'is-selected':''}>02 <b>친구 대전</b><small>PRIVATE 1V1</small></button>
  </div>
  {mode==='solo'?<div className="dl-play-controls">
   <label htmlFor="dl-bot-level">AI 난이도</label>
   <select id="dl-bot-level" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
    <option value="rookie">신병 — 연습하기 좋은 상대</option>
    <option value="regular">정규병 — 강화된 AI</option>
   </select>
   <button type="button" className="dl-cta" onClick={()=>onSolo(difficulty)} disabled={!connected||!!pending}>{pending==='solo'?'전장 준비 중…':'▶ AI 전투 시작'}</button>
  </div>:<div className="dl-play-controls">
   <button type="button" className="dl-cta" onClick={onCreate} disabled={!connected||!!pending}>{pending==='create'?'방 생성 중…':'+ 비공개 방 생성'}</button>
   <form className="dl-invite-form" onSubmit={onJoin}>
    <label htmlFor="dl-invite">초대 코드로 입장</label>
    <div><input id="dl-invite" maxLength={6} aria-label="초대 코드" placeholder="ABC123" value={typedCode} onChange={e=>onCodeChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}/>
    <button type="submit" disabled={!connected||!!pending}>입장</button></div>
   </form>
  </div>}
  <p className="dl-note">현재 전투 모드는 기존 솔로 AI전과 1:1 친구 대전이야.</p>
 </div>;
}
function RecordDetail(){return <div className="dl-detail dl-record">
 <div className="dl-panel-eyebrow">FIELD INTELLIGENCE / RECORDS</div>
 <div className="dl-panel-heading"><h2>COMBAT RECORD</h2><span>DATA STATUS</span></div>
 <div className="dl-record-empty"><span aria-hidden="true">▥</span><h3>누적 전적 기록 준비 중</h3>
 <p>현재 업로드된 프런트엔드에는 영구 전적 조회 기능이 없어. 경기 중 킬·데스 정보는 전투 HUD에서 확인할 수 있어.</p>
 </div>
 </div>;}
function SettingsDetail({quality,onQualityChange,sensitivity,onSensitivityChange}){return <div className="dl-detail dl-settings">
 <div className="dl-panel-eyebrow">PLAYER CONFIGURATION</div>
 <div className="dl-panel-heading"><h2>SETTINGS</h2><span>INPUT / VIDEO</span></div>
 <SettingsPanel embedded value={sensitivity} onChange={onSensitivityChange} onReset={onSensitivityChange}/>
 <div className="dl-quality"><GraphicsQualitySelect value={quality} onChange={onQualityChange}/></div>
 </div>;}

export function MainMenu({connected,pending,message,typedCode,onCodeChange,onJoin,onCreate,onSolo,
 operatorId,onOperatorChange,quality,onQualityChange,sensitivity,onSensitivityChange}){
 // 'home' preserves the clean four-operator cinematic composition at startup.
 const [tab,setTab]=useState(()=>new URLSearchParams(window.location.search).has('room')?'play':'home');
 useEffect(()=>{
  if(tab==='home')return;
  const onEscape=e=>{if(e.key==='Escape'){
   // Native form widgets retain their usual Escape behavior.
   if(e.target?.tagName==='SELECT')return;
   e.preventDefault();setTab('home');
  }};
  window.addEventListener('keydown',onEscape);
  return ()=>window.removeEventListener('keydown',onEscape);
 },[tab]);
 const selected=OPERATORS[operatorId]||OPERATORS[OPERATOR_IDS[0]];
 const active=tab==='home'?'play':tab;
 const tabTitle=NAV.find(item=>item.id===tab)?.ko;
 return <section className={'duel-lobby '+(tab==='home'?'dl-home':'dl-open')} style={{'--dl-lobby-art':`url("${UI_ASSETS}lobby-iron-front.webp")`}} aria-label="DUELTICS 메인 로비">
  <div className="dl-art" aria-hidden="true"/>
  <div className="dl-shading" aria-hidden="true"/>
  <h1 className="dl-visually-hidden">DUELTICS — FRONTLINE REFORGED</h1>
  <header className="dl-topbar">
   <div className="dl-spacer-logo" aria-hidden="true"/>
   <div className="dl-top-status">
    <span className={'dl-connection '+(connected?'is-online':'is-offline')}><i/>{connected?'ONLINE':'CONNECTING'}</span>
    <span className="dl-top-divider"/>
    <span className="dl-player-icon" aria-hidden="true">◈</span>
    <div className="dl-player-text"><strong>Operator_00</strong><small>{selected.name} · FTG</small></div>
   </div>
  </header>
  <nav className="dl-nav" aria-label="메인 게임 메뉴">
   {NAV.map(item=><button key={item.id} type="button" className={'dl-nav-button '+(active===item.id?'is-active':'')}
    aria-current={tab===item.id?'page':undefined} onClick={()=>setTab(item.id)}>
    <span className="dl-nav-glyph" aria-hidden="true">{item.glyph}</span>
    <span className="dl-nav-copy"><strong>{item.ko}</strong><small>{item.en}</small></span>
   </button>)}
  </nav>
  {tab!=='home'&&<div className="dl-overlay-shell" role="region" aria-label={tabTitle+' 화면'}>
   <button type="button" className="dl-back" onClick={()=>setTab('home')} aria-label="메인 로비로 돌아가기">← 로비로 돌아가기 <kbd>ESC</kbd></button>
   {tab==='play'&&<PlayDetail connected={connected} pending={pending} typedCode={typedCode} onCodeChange={onCodeChange} onJoin={onJoin} onCreate={onCreate} onSolo={onSolo}/>}
   {tab==='operators'&&<OperatorDetail operatorId={operatorId} onOperatorChange={onOperatorChange}/>}
   {tab==='armory'&&<ArmoryDetail/>}
   {tab==='record'&&<RecordDetail/>}
   {tab==='settings'&&<SettingsDetail quality={quality} onQualityChange={onQualityChange} sensitivity={sensitivity} onSensitivityChange={onSensitivityChange}/>}
  </div>}
  {tab==='home'&&<div className="dl-squad-strip" role="group" aria-label="FTG 오퍼레이터 분대">
   {SQUAD_ORDER.map(id=><button type="button" key={id} aria-label={OPERATORS[id].name+' 오퍼레이터 상세 보기'}
    onClick={()=>{onOperatorChange(id);setTab('operators');}}>
    <span className="dl-squad-diamond" aria-hidden="true">◇</span>
    <span><strong>{OPERATORS[id].name}</strong><small>{OPERATORS[id].tag} / {OPERATORS[id].role}</small></span>
   </button>)}
  </div>}
  {message&&<div className="dl-notice" role="status">{message}</div>}
  <footer className="dl-footer">
   <span className="dl-footer-online"><i className={connected?'is-online':''}/>{connected?'ONLINE':'CONNECTING'}</span>
   <span className="dl-footer-location">FTG / FRONTLINE TASK GROUP</span>
   <span>BUILD {GAME_VERSION}</span>
  </footer>
 </section>;
}
