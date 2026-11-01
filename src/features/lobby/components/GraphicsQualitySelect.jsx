export function GraphicsQualitySelect({value,onChange}){
 return <div className="graphics-option">
  <label htmlFor="graphics-quality">그래픽 품질</label>
  <select id="graphics-quality" value={value} onChange={event=>onChange(event.target.value)}>
   <option value="low">성능 우선</option>
   <option value="balanced">균형 (추천)</option>
   <option value="high">고화질</option>
  </select>
 </div>;
}
