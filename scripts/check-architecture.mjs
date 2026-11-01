import {readdirSync,readFileSync,statSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASSET_CATALOG,ASSET_GROUPS,resolveAssetUrl} from '../src/assets/catalog.js';

// Runs locally, in CI and as a Node test. No browser, database or network required.
const REPO_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fileList=(folder)=>{
 if(!existsSync(folder))return [];
 const out=[];
 for(const entry of readdirSync(folder,{withFileTypes:true})){
  const target=path.join(folder,entry.name);
  if(entry.isDirectory())out.push(...fileList(target));
  else if(entry.isFile())out.push(target);
 }
 return out;
};
const within=(child,parent)=>child===parent||child.startsWith(parent+path.sep);
export function inspectArchitecture(root=REPO_ROOT){
 const errors=[];
 const src=path.join(root,'src'),server=path.join(root,'server'),shared=path.join(root,'shared');
 const features=path.join(src,'features');
 const assets=path.join(root,'public','assets');
 const knownFeatures=['arena','combat','lobby','match','operators','modes'];
 for(const name of knownFeatures){
  if(!existsSync(path.join(features,name)))errors.push('Missing feature directory: '+name);
 }
 const sources=[...fileList(src),...fileList(server),...fileList(shared)]
  .filter(file=>/\.(jsx?|mjs)$/.test(file));
 for(const file of sources){
  const content=readFileSync(file,'utf8');
  const fromFeature=within(file,features)?path.relative(features,file).split(path.sep)[0]:null;
  const regex=/(?:\bfrom\s*|\bimport\s*\(|\bimport\s*)['"]([^'"]+)['"]/g;
  let match;
  while((match=regex.exec(content))){
   const spec=match[1];
   if(!spec.startsWith('.'))continue;
   const target=path.resolve(path.dirname(file),spec);
   if(!within(target,root)){errors.push('Import escaped repository: '+path.relative(root,file)+' -> '+spec);continue;}
   if(!existsSync(target)){errors.push('Missing import: '+path.relative(root,file)+' -> '+spec);continue;}
   if(within(file,server)&&within(target,src))errors.push('Server must not import client source: '+path.relative(root,file));
   if(within(file,shared)&&(within(target,src)||within(target,server)))errors.push('Shared rules must not import client/server: '+path.relative(root,file));
   if(within(file,src)&&within(target,server))errors.push('Client must not import server implementation: '+path.relative(root,file));
   if(fromFeature && within(target,features)){
    const toFeature=path.relative(features,target).split(path.sep)[0];
    if(toFeature!==fromFeature && path.basename(target)!=='index.js')
     errors.push('Cross-feature imports must use index.js: '+path.relative(root,file)+' -> '+spec);
   }
  }
 }
 const assetPaths=fileList(assets).filter(file=>!['.gitkeep','README.md'].includes(path.basename(file)));
 const byCase=new Set();
 for(const file of assetPaths){
  const name=path.relative(assets,file).replaceAll(path.sep,'/');
  if(byCase.has(name.toLowerCase()))errors.push('Case-insensitive duplicate asset filename: '+name);
  byCase.add(name.toLowerCase());
  if(!/^[a-z0-9][a-z0-9._/-]*$/i.test(name)||name.split('/').some(part=>part!==part.toLowerCase()))
   errors.push('Asset filename must be lowercase kebab-case: '+name);
  if(statSync(file).size>12*1024*1024)errors.push('Single game asset exceeds 12 MB: '+name);
 }
 for(const group of ASSET_GROUPS){
  if(!existsSync(path.join(assets,group)))errors.push('Missing asset group: '+group);
 }
 for(const [id,item] of Object.entries(ASSET_CATALOG)){
  if(!ASSET_GROUPS.includes(item.group))errors.push('Asset has unknown category: '+id);
  if(item.file){
   const url=resolveAssetUrl(id);
   if(!url){errors.push('Asset URL invalid: '+id);continue;}
   const filepath=path.join(root,'public',url.substring(1));
   if(!existsSync(filepath))errors.push('Catalog points to missing asset: '+id);
  }
 }
 return errors;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const errors=inspectArchitecture();
 if(errors.length){
  for(const error of errors)console.error('ARCHITECTURE ERROR:',error);
  process.exitCode=1;
 }else{
  console.log('P0 architecture check passed: source import boundaries, asset groups/catalog and naming.');
 }
}
