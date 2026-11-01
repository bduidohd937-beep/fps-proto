// Read-only quality presets: renderer and arena lighting must agree.
export const QUALITY_PRESETS=Object.freeze({
 low:Object.freeze({dpr:Object.freeze([.75,1]),shadows:false,shadowMapSize:Object.freeze([512,512])}),
 balanced:Object.freeze({dpr:Object.freeze([1,1.25]),shadows:true,shadowMapSize:Object.freeze([1024,1024])}),
 high:Object.freeze({dpr:Object.freeze([1,1.6]),shadows:true,shadowMapSize:Object.freeze([2048,2048])})
});
export const CAMERA_CONFIG=Object.freeze({fov:78,near:.06,far:110});
export function resolveQuality(key='balanced'){
 return QUALITY_PRESETS[key]??QUALITY_PRESETS.balanced;
}
