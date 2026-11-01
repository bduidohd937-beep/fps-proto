import {DEFAULT_SENSITIVITY,SENSITIVITY_LIMITS} from '../sensitivity.js';

const valueLabel=value=>Number(value).toFixed(1);
export function SettingsPanel({value,onChange,onReset,onClose,embedded=false}){
 const update=(key,next)=>onChange({...value,[key]:Number(next)});
 return <section className={'settings-panel '+(embedded?'settings-embedded':'')} aria-label="게임 설정">
  <div className="settings-header"><div><div className="menu-panel-kicker">SYSTEM / SETTINGS</div><h2>게임 설정</h2></div>
   {onClose&&<button type="button" className="settings-close" onClick={onClose} aria-label="설정 닫기">×</button>}
  </div>
  <p className="settings-copy">마우스 시점 감도는 이 브라우저에 저장되며 서버의 조준·피해·충돌 판정에는 영향을 주지 않습니다.</p>
  <label className="settings-slider"><span><strong>일반 마우스 감도</strong><output>{valueLabel(value.general)}×</output></span>
   <input aria-label="일반 마우스 감도" type="range" min={SENSITIVITY_LIMITS.general.min} max={SENSITIVITY_LIMITS.general.max} step={SENSITIVITY_LIMITS.general.step} value={value.general} onChange={e=>update('general',e.target.value)}/>
  </label>
  <label className="settings-slider"><span><strong>ADS 감도 배율</strong><output>{valueLabel(value.ads)}×</output></span>
   <input aria-label="ADS 감도 배율" type="range" min={SENSITIVITY_LIMITS.ads.min} max={SENSITIVITY_LIMITS.ads.max} step={SENSITIVITY_LIMITS.ads.step} value={value.ads} onChange={e=>update('ads',e.target.value)}/>
  </label>
  <div className="settings-actions"><button type="button" className="secondary" onClick={()=>onReset({...DEFAULT_SENSITIVITY})}>기본값 복원</button>{onClose&&<button type="button" className="primary" onClick={onClose}>적용 후 닫기</button>}</div>
 </section>;
}
