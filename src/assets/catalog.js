// Stable IDs and fallback semantics prevent missing optional assets from breaking a match.
// Only declare URLs for files actually present under public/assets/.
export const ASSET_GROUPS=Object.freeze(['operators','weapons','maps','audio','ui']);
export const ASSET_CATALOG=Object.freeze({
 'operator.default':Object.freeze({group:'operators',file:null,fallback:'procedural-soldier'}),
 'weapon.default':Object.freeze({group:'weapons',file:null,fallback:'procedural-rifle'}),
 'map.iron-depot':Object.freeze({group:'maps',file:null,fallback:'procedural-iron-depot'}),
 'audio.footstep.default':Object.freeze({group:'audio',file:null,fallback:'silent'}),
 'ui.placeholder':Object.freeze({group:'ui',file:null,fallback:'css'})
});
export function resolveAssetUrl(id){
 const asset=ASSET_CATALOG[id];
 if(!asset||!asset.file)return null;
 if(!ASSET_GROUPS.includes(asset.group)||!/^[a-z0-9._/-]+$/i.test(asset.file)||asset.file.includes('..')||asset.file.startsWith('/'))return null;
 return '/assets/'+asset.group+'/'+asset.file;
}
