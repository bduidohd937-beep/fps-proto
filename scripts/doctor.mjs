import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAME_SERVICE,GAME_VERSION,GAME_PROTOCOL} from '../shared/version.js';

// Run on the USER'S machine; remote GitHub CI cannot inspect localhost:5173 on Windows.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const meta=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
const currentBranch=()=>{
 try{return execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8',timeout:4000}).trim();}
 catch{return 'unavailable';}
};
const probe=async url=>{
 try{
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(2000)});
  if(!response.ok)return {status:'error',message:'HTTP '+response.status};
  return {status:'ok',text:await response.text()};
 }catch(e){return {status:'offline',message:e?.cause?.code||e.message};}
};
console.log('\nPROJECT DUEL P0 — local version diagnostic');
console.log('Git branch:',currentBranch());
console.log('package.json:',meta.version,'/ shared expected:',GAME_VERSION,'protocol',GAME_PROTOCOL);
let problem=false;
if(meta.version!==GAME_VERSION){
 console.error('ERROR: package.json and shared/version.js disagree.');
 problem=true;
}
const health=await probe('http://127.0.0.1:43171/api/health');
if(health.status==='ok'){
 try{
  const state=JSON.parse(health.text);
  console.log('Local Socket.IO server:',state.version,'protocol',state.protocol);
  if(state.service!==GAME_SERVICE||state.protocol!==GAME_PROTOCOL||state.version!==GAME_VERSION){
   console.error('ERROR: port 43171 serves another/older game version. Stop the old npm run dev process.');
   problem=true;
  }
 }catch{console.error('ERROR: /api/health did not return valid JSON');problem=true;}
}else console.log('Local game server (:43171): not running / unreachable');
const vite=await probe('http://127.0.0.1:5173/src/App.jsx');
if(vite.status==='ok'){
 const expected='features/combat/index.js';
 console.log('Vite dev server (:5173): detected');
 if(!vite.text.includes(expected)){
  console.error('ERROR: :5173 is serving a different/old App.jsx (possibly V0.1.3).');
  console.error('Close old terminals and run: git fetch origin; git switch '+JSON.stringify('chore/frontline-v0.3.0-p0-foundation')+'; npm install; npm run dev');
  problem=true;
 }else console.log('Vite App.jsx: P0 feature import marker found');
}else console.log('Vite dev server (:5173): not running / unreachable');
if(problem){console.log('\nFix version mismatch before gameplay testing.');process.exitCode=1;}
else console.log('\nNo detectable version conflict. If servers are off, start npm run dev and re-run npm run doctor.');
