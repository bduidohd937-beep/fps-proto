// Cosmetic-only operators in V0.3.0: all have identical actual damage/movement/hitboxes.
export const DEFAULT_OPERATOR_ID='iron-wolf';
export const OPERATOR_IDS=Object.freeze(['iron-wolf','ghost','bulwark','hawkeye']);
export const OPERATORS=Object.freeze({
 'iron-wolf':Object.freeze({id:'iron-wolf',name:'IRON WOLF',role:'돌격병',tag:'ASSAULT',color:'#808978',secondary:'#333e37',description:'선두에서 진입하는 균형형 돌격병.',futurePerk:'공격력 조정 후보'}),
 'ghost':Object.freeze({id:'ghost',name:'GHOST',role:'정찰병',tag:'RECON',color:'#78908a',secondary:'#344b4d',description:'가볍게 기동하는 정찰 전문 오퍼레이터.',futurePerk:'이동속도 조정 후보'}),
 'bulwark':Object.freeze({id:'bulwark',name:'BULWARK',role:'지원병',tag:'SUPPORT',color:'#9c8874',secondary:'#51443c',description:'탄약과 보급을 책임지는 지원병.',futurePerk:'재장전 속도 조정 후보'}),
 'hawkeye':Object.freeze({id:'hawkeye',name:'HAWKEYE',role:'사수',tag:'MARKSMAN',color:'#82948a',secondary:'#4b5549',description:'원거리 관측과 정밀 사격을 선호하는 사수.',futurePerk:'정조준 안정성 조정 후보'})
});
export const getOperator=id=>OPERATORS[id]??null;
export const validOperator=id=>getOperator(id)?.id??DEFAULT_OPERATOR_ID;
