import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer,publicState} from '../server/domain/players.js';
import {applyFire} from '../server/domain/combat.js';
import {findGroundPath,NAVIGATION_INFO,navigationPointAllowed} from '../server/bots/navigation.js';
import {createBotBrain,botLineOfSight,decideBot,updateBot,BOT_DIFFICULTY} from '../server/bots/controller.js';
import {validOperator,DEFAULT_OPERATOR_ID} from '../shared/operators.js';
const bot=()=>newPlayer({id:'bot:solo'},1,{bot:true,difficulty:'rookie'});
const human=()=>newPlayer({id:'human'},0);
test('operator IDs are safe and have cosmetic-only rules in V0.3.0',()=>{
 assert.equal(validOperator('hawkeye'),'hawkeye');
 assert.equal(validOperator('bad'),DEFAULT_OPERATOR_ID);
 const u=newPlayer({id:'a'},0,{operatorId:'ghost'});
 assert.equal(u.operatorId,'ghost');
 assert.equal(u.hp,100);
 assert.equal(u.ammo,24);
});
test('solo state serializes bot marker and difficulty but not private inventories',()=>{
 const state=publicState({code:'ABCDEF',mode:'solo',difficulty:'rookie',status:'playing',winnerId:null,players:[human(),bot()]});
 assert.equal(state.players.length,2);
 assert.equal(state.players[1].bot,true);
 assert.equal(state.mode,'solo');
 assert.equal(state.difficulty,'rookie');
 assert.ok(!('magazines' in state.players[1]));
});
test('AI patrol graph covers obstacle-free spawn and returns only free nodes',()=>{
 assert.ok(NAVIGATION_INFO.open>100);
 assert.equal(navigationPointAllowed(-17,-17),true);
 const route=findGroundPath({x:17,z:17},{x:-17,z:-17});
 assert.ok(route.length>8);
 assert.ok(route.every(node=>navigationPointAllowed(node.x,node.z)));
});
test('line of sight respects solid cargo cover',()=>{
 const a={...bot(),x:-17,z:-9};
 const b={...human(),x:17,z:-9};
 assert.equal(botLineOfSight(a,b),false);
 a.z=-17;b.z=-17;b.x=-12;
 assert.equal(botLineOfSight(a,b),true);
});
test('bot observes a visible nearby player, then becomes engaged after reaction delay',()=>{
 const a={...bot(),x:-17,z:-17,yaw:-Math.PI/2};
 const b={...human(),x:-12,z:-17};
 const brain=createBotBrain(100);
 let decision=decideBot(a,b,brain,100,()=>.5,'rookie');
 assert.equal(decision.mode,'alert');
 decision=decideBot(a,b,brain,1100,()=>.5,'rookie');
 assert.equal(decision.mode,'engage');
 assert.ok(Math.abs(decision.yaw+Math.PI/2)<.01);
 assert.equal(decision.visible,true);
});
test('bot does not fire at targets hidden behind a shipping container',()=>{
 const a={...bot(),x:-17,z:-9,yaw:-Math.PI/2};
 const b={...human(),x:17,z:-9};
 const brain=createBotBrain(500);
 for(let t=500;t<2500;t+=300){
  const decision=decideBot(a,b,brain,t,()=>.5);
  assert.equal(decision.fire,false);
 }
});
test('bot and human share the exact same authoritative fire mechanism',()=>{
 const a={...bot(),x:-17,z:-17,yaw:-Math.PI/2,pitch:0,ads:true};
 const b={...human(),x:-12,z:-17};
 const room={status:'playing',winnerId:null,players:[a,b]};
 const shot=applyFire(room,a,5000,()=>.5);
 assert.equal(shot?.shooterId,a.id);
 assert.equal(a.ammo,23);
 assert.ok(b.hp<100);
 assert.equal(shot?.weaponId,'AR4');
});
test('bot movement advances using 3D collision simulation',()=>{
 const a={...bot(),x:17,z:17};
 const b={...human(),x:-17,z:-17};
 const room={mode:'solo',status:'playing',players:[b,a],difficulty:'rookie'};
 const before={x:a.x,z:a.z};
 let events=0;
 for(let t=1000;t<3000;t+=1000/30)updateBot(room,a,b,t,1/30,()=>events++,()=>.5);
 assert.ok(Math.hypot(a.x-before.x,a.z-before.z)>.2);
 assert.ok(Math.abs(a.x)<22&&Math.abs(a.z)<22);
});
test('AI difficulty profiles expose distinct reaction intervals',()=>{
 assert.ok(BOT_DIFFICULTY.rookie.reactionMs>BOT_DIFFICULTY.regular.reactionMs);
});
