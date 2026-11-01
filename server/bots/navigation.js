import {WORLD_BOXES,PLAYER_RADIUS,PLAYER_HEIGHT,canFit} from '../../shared/rules.js';

// Ground-level 8-connected path graph (21x21, ~2m cells). Reuse graph in every bot.
const SPACING=2,MIN=-20,MAX=20,SIZE=Math.round((MAX-MIN)/SPACING)+1;
// Ground nav uses the same standing capsule volume as the game simulation.
function blocked(x,z){
 if(Math.abs(x)>20||Math.abs(z)>20)return true;
 return !canFit(x,0,z,PLAYER_HEIGHT);
}
function clearEdge(a,b){
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.35));
 for(let step=1;step<=steps;step++){
  const alpha=step/steps;
  if(blocked(a.x+(b.x-a.x)*alpha,a.z+(b.z-a.z)*alpha))return false;
 }
 return true;
}
const nodes=Array.from({length:SIZE*SIZE},(_,i)=>{
 const col=i%SIZE,row=Math.floor(i/SIZE),x=MIN+col*SPACING,z=MIN+row*SPACING;
 return {id:i,x,z,open:!blocked(x,z),col,row};
});
const nearby=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
const adjacency=nodes.map(node=>{
 if(!node.open)return [];
 return nearby.flatMap(([dx,dz])=>{
  const col=node.col+dx,row=node.row+dz;
  if(col<0||col>=SIZE||row<0||row>=SIZE)return [];
  const target=nodes[row*SIZE+col];
  if(!target.open)return [];
  if(dx&&dz&&(!nodes[node.row*SIZE+col].open||!nodes[row*SIZE+node.col].open))return [];
  if(!clearEdge(node,target))return [];
  return [{id:target.id,cost:Math.hypot(dx,dz)}];
 });
});
export function navigationPointAllowed(x,z){return !blocked(x,z);}
function nearestNode(x,z){
 let best=null,distance=Infinity;
 for(const node of nodes){
  if(!node.open)continue;
  const d=(node.x-x)**2+(node.z-z)**2;
  if(d<distance){distance=d;best=node;}
 }
 return best;
}
export function findGroundPath(from,to){
 const start=nearestNode(from.x,from.z),goal=nearestNode(to.x,to.z);
 if(!start||!goal)return [];
 if(start.id===goal.id)return [{x:goal.x,z:goal.z}];
 const scores=new Float64Array(nodes.length).fill(Infinity);
 const costs=new Float64Array(nodes.length).fill(Infinity);
 const previous=new Int32Array(nodes.length).fill(-1);
 const pending=new Set([start.id]);
 scores[start.id]=Math.hypot(start.x-goal.x,start.z-goal.z);
 costs[start.id]=0;
 let iterations=0;
 while(pending.size&&iterations++<nodes.length){
  let current=-1,best=Infinity;
  for(const id of pending)if(scores[id]<best){current=id;best=scores[id];}
  if(current===goal.id)break;
  pending.delete(current);
  for(const next of adjacency[current]){
   const tentative=costs[current]+next.cost;
   if(tentative>=costs[next.id])continue;
   previous[next.id]=current;costs[next.id]=tentative;
   scores[next.id]=tentative+Math.hypot(nodes[next.id].x-goal.x,nodes[next.id].z-goal.z)/SPACING;
   pending.add(next.id);
  }
 }
 if(previous[goal.id]<0)return [];
 const path=[];let cur=goal.id;
 while(cur!==start.id&&cur>=0&&path.length<300){
  path.unshift({x:nodes[cur].x,z:nodes[cur].z});
  cur=previous[cur];
 }
 // Downsample walkable diagonal-line sequences. No collision-unsafe shortcuts.
 return path;
}
export const NAVIGATION_INFO=Object.freeze({size:SIZE*SIZE,spacing:SPACING,open:nodes.filter(n=>n.open).length});
