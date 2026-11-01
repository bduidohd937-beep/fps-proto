import {useState} from 'react';
import {GraphicsQualitySelect} from './GraphicsQualitySelect.jsx';
import {OperatorPreview} from '../../operators/index.js';
import {OPERATOR_IDS,OPERATORS} from '../../../../shared/operators.js';
import {GAME_VERSION} from '../../../../shared/version.js';
import {WEAPON_IDS,WEAPONS} from '../../../../shared/weapons.js';

// UI-only component. Network lifecycle and authoritative game state stay in App/server.
export function MainMenu({connected,pending,message,typedCode,onCodeChange,onJoin,onCreate,onSolo,
 operatorId,onOperatorChange,quality,onQualityChange}){
 const [tab,setTab]=useState(()=>new URLSearchParams(window.location.search).has('room')?'private':'solo');
 const [difficulty,setDifficulty]=useState('rookie');
 const selected=OPERATORS[operatorId]||OPERATORS[OPERATOR_IDS[0]];
 return <section className="frontline-menu">
  <div className="menu-ambient-glow"/>
  <header className="menu-top">
   <div className="menu-brand">
    <span className="menu-brand-mark">◆</span>
    <div><strong>PROJECT <em>DUEL</em></strong><small>FRONTLINE REFORGED</small></div>
   </div>
   <div className="menu-top-right">
    <span className={'menu-server '+(connected?'online':'offline')}>{connected?'● ONLINE':'○ CONNECTING'}</span>
    <span className="menu-version">BUILD {GAME_VERSION}</span>
   </div>
  </header>
  <div className="menu-content">
   <div className="menu-left">
    <div className="menu-eyebrow">OPERATION CONTROL / DEPLOYMENT</div>
    <h1>YOUR NEXT<br/><span>MISSION.</span></h1>
    <p className="menu-intro">작전을 선택하고 전장에 투입하라. 혼자 AI와 대전하거나 친구와 1대1 전투를 즐길 수 있어.</p>
    <nav className="menu-tabs" aria-label="메인 게임 메뉴">
     <button type="button" className={tab==='solo'?'active':''} onClick={()=>setTab('solo')} aria-current={tab==='solo'?'page':undefined}>
      <span className="menu-tab-index">01</span><span>솔로 플레이 <small>SOLO OPERATIONS</small></span><span className="menu-tab-arrow">›</span>
     </button>
     <button type="button" className={tab==='private'?'active':''} onClick={()=>setTab('private')} aria-current={tab==='private'?'page':undefined}>
      <span className="menu-tab-index">02</span><span>친구 대전 <small>PRIVATE MATCH</small></span><span className="menu-tab-arrow">›</span>
     </button>
     <button type="button" className={tab==='operators'?'active':''} onClick={()=>setTab('operators')} aria-current={tab==='operators'?'page':undefined}>
      <span className="menu-tab-index">03</span><span>오퍼레이터 <small>OPERATOR SELECT</small></span><span className="menu-tab-arrow">›</span>
     </button>
     <button type="button" className={tab==='armory'?'active':''} onClick={()=>setTab('armory')} aria-current={tab==='armory'?'page':undefined}>
      <span className="menu-tab-index">04</span><span>무기고 <small>LOADOUT PREVIEW</small></span><span className="menu-tab-arrow">›</span>
     </button>
    </nav>
    <section className="menu-action-panel">
     {tab==='solo'&&<>
      <div className="menu-panel-kicker">SOLO / BOT MATCH</div>
      <h2>혼자 전투 시작</h2>
      <p>친구를 기다리지 않고 서버 AI와 즉시 1대1 전투를 시작해.</p>
      <label className="menu-field-label" htmlFor="bot-difficulty">AI 난이도</label>
      <select id="bot-difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
       <option value="rookie">신병 — 연습하기 좋은 상대</option>
       <option value="regular">정규병 — 빠른 판단과 높은 정확도</option>
      </select>
      <button type="button" className="menu-deploy" onClick={()=>onSolo(difficulty)} disabled={!connected||!!pending}>
       {pending==='solo'?'AI 전장 준비 중...':'▶ AI 대전 시작'}
      </button>
     </>}
     {tab==='private'&&<>
      <div className="menu-panel-kicker">PRIVATE / INVITE</div>
      <h2>친구와 전투</h2>
      <p>비공개 방을 만들거나 친구에게 받은 초대 코드로 참가해.</p>
      <button type="button" className="menu-deploy" onClick={onCreate} disabled={!connected||!!pending}>
       {pending==='create'?'전장 생성 중...':'+ 전장 생성'}
      </button>
      <form className="menu-join" onSubmit={onJoin}>
       <label className="menu-field-label" htmlFor="menu-invite-code">친구 초대 코드</label>
       <div className="menu-join-row">
        <input id="menu-invite-code" aria-label="초대 코드" maxLength={6} value={typedCode}
         onChange={e=>onCodeChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))} placeholder="ABC123"/>
        <button type="submit" disabled={!connected||!!pending}>입장</button>
       </div>
      </form>
     </>}
     {tab==='operators'&&<>
      <div className="menu-panel-kicker">OPERATORS / SELECT</div>
      <h2>오퍼레이터 선택</h2>
      <p>4명 모두 이용 가능. 현재 버전에서는 외형만 다르고 전투 능력치는 동일해.</p>
      <div className="menu-operator-grid">
       {OPERATOR_IDS.map(id=><button key={id} type="button" className={'operator-option '+(operatorId===id?'active':'')}
        onClick={()=>onOperatorChange(id)} aria-pressed={operatorId===id}>
        <span className="operator-option-color" style={{background:OPERATORS[id].color}}/>
        <strong>{OPERATORS[id].name}</strong><small>{OPERATORS[id].role}</small>
       </button>)}
      </div>
     </>}
     {tab==='armory'&&<>
      <div className="menu-panel-kicker">ARMORY / LOADOUT</div>
      <h2>무기고</h2>
      <p>기본 4종을 전투 중 숫자키 1~4로 전환해. 무기 구매·스킨은 후속 패치야.</p>
      <div className="menu-armory-list">
       {WEAPON_IDS.map((id,index)=><div key={id}>
        <span>{index+1}</span><strong>{WEAPONS[id].name}</strong><small>{WEAPONS[id].category} · {WEAPONS[id].magazine}발</small>
       </div>)}
      </div>
     </>}
    </section>
    <div className="menu-bottom-tools">
     <GraphicsQualitySelect value={quality} onChange={onQualityChange}/>
     <span className="menu-location">IRON DEPOT · FIELD OPERATIONS</span>
    </div>
    {message&&<div className="menu-notice" role="status">{message}</div>}
   </div>
   <aside className="menu-right" aria-label="선택 오퍼레이터">
    <div className="menu-scenery-label">MILITARY PERSONNEL / 01</div>
    <OperatorPreview operatorId={operatorId} quality={quality}/>
    <div className="menu-personnel-card">
     <div><small>CURRENT OPERATOR</small><strong>{selected.name}</strong><span>{selected.role} / {selected.tag}</span></div>
     <p>{selected.description}</p>
     <div className="menu-personnel-pills"><span>기본 능력치 동일</span><span>전투 중 교체 불가</span></div>
    </div>
   </aside>
  </div>
  <footer className="menu-footer">
   <span>WASD 이동 · SHIFT 질주 · SPACE 점프 · 우클릭 ADS · 숫자키 1~4 무기</span>
   <span>ONLINE TACTICAL ARENA</span>
  </footer>
 </section>;
}
