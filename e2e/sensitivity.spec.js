import {test,expect} from '@playwright/test';

test('settings persist, recover invalid storage and apply general/ADS mouse movement',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('project-duel-sensitivity',JSON.stringify({general:Infinity,ads:-4})));
 await page.reload();
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/설정/}).click();
 await expect(page.getByRole('slider',{name:'일반 마우스 감도'})).toHaveValue('1');
 await expect(page.getByRole('slider',{name:'ADS 감도 배율'})).toHaveValue('0.8');
 await page.getByRole('slider',{name:'일반 마우스 감도'}).fill('2');
 await page.getByRole('slider',{name:'ADS 감도 배율'}).fill('0.5');
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('project-duel-sensitivity'))).toBe(JSON.stringify({general:2,ads:.5}));
 await page.reload();
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/설정/}).click();
 await expect(page.getByRole('slider',{name:'일반 마우스 감도'})).toHaveValue('2');
 await expect(page.getByRole('slider',{name:'ADS 감도 배율'})).toHaveValue('0.5');
 await page.getByRole('button',{name:'기본값 복원'}).click();
 await expect(page.getByRole('slider',{name:'일반 마우스 감도'})).toHaveValue('1');
 await expect(page.getByRole('slider',{name:'ADS 감도 배율'})).toHaveValue('0.8');
});

test('mouse movement exposes different applied yaw for general and ADS sensitivity',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('project-duel-sensitivity',JSON.stringify({general:2,ads:.5})));
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/AI 대전 시작/}).click();
 await expect(page.locator('.scoreboard')).toBeVisible();
 const canvas=page.locator('canvas').first();
 await expect(canvas).toHaveAttribute('data-input-ready','true');
 await page.bringToFront();
 const box=await canvas.boundingBox();
 if(!box)throw new Error('game canvas has no bounds');
 const centerX=Math.floor(box.x+box.width/2),centerY=Math.floor(box.y+box.height/2);
 const readInput=()=>page.evaluate(()=>{
  const canvas=document.querySelector('canvas');
  return {lock:document.pointerLockElement===canvas,lockState:canvas?.dataset.acceptancePointerLock,
   aim:canvas?.dataset.acceptanceAim,events:Number(canvas?.dataset.acceptanceMouseEvents||0),
   movementX:Number(canvas?.dataset.acceptanceMouseTotalX||0),movementY:Number(canvas?.dataset.acceptanceMouseTotalY||0),
   yaw:Number(canvas?.dataset.acceptanceYaw),mouseYaw:Number(canvas?.dataset.acceptanceMouseYaw||0),sensitivity:Number(canvas?.dataset.acceptanceLastSensitivity||0)};
 });
 const expectYawChange=async(before,label)=>{
  try{
   await expect.poll(async()=>Number(await canvas.getAttribute('data-acceptance-yaw')),{timeout:3000}).not.toBe(before);
  }catch(error){
   await test.info().attach(`${label}-input-diagnostics`,{body:JSON.stringify(await readInput(),null,2),contentType:'application/json'});
   throw error;
  }
 };
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===document.querySelector('canvas'))).toBe(true);
 await expect(canvas).toHaveAttribute('data-acceptance-pointer-lock','locked');
 await expect(canvas).toHaveAttribute('data-acceptance-aim','general');
 const before=Number(await canvas.getAttribute('data-acceptance-yaw'));
 await page.mouse.move(centerX+100,centerY+100,{steps:1});
 await expectYawChange(before,'general');
 const generalInput=Math.abs((await readInput()).movementX);
 const generalState=await readInput();
 const generalDelta=Math.abs(Number(await canvas.getAttribute('data-acceptance-yaw'))-before);
 const generalMouseDelta=Math.abs(generalState.mouseYaw);
 expect(generalInput).toBeGreaterThan(0);
 expect(generalMouseDelta).toBeGreaterThan(0);
 const generalRate=generalMouseDelta/generalInput;
 await page.evaluate(()=>document.exitPointerLock());
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null)).toBe(true);
 await page.mouse.move(centerX+100,centerY+100,{steps:1});
 await page.mouse.click(centerX,centerY);
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===document.querySelector('canvas'))).toBe(true);
 await page.mouse.down({button:'right'});
 await expect(canvas).toHaveAttribute('data-acceptance-aim','ads');
 const adsBefore=Number(await canvas.getAttribute('data-acceptance-yaw'));
 const adsInputBefore=(await readInput()).movementX;
 await page.mouse.move(centerX+200,centerY+100,{steps:1});
 await expectYawChange(adsBefore,'ads');
 const adsInput=Math.abs((await readInput()).movementX-adsInputBefore);
 const adsState=await readInput();
 const adsDelta=Math.abs(Number(await canvas.getAttribute('data-acceptance-yaw'))-adsBefore);
 const adsMouseDelta=Math.abs(adsState.mouseYaw-generalState.mouseYaw);
 await page.mouse.up({button:'right'});
 expect(adsInput).toBeGreaterThan(0);
 expect(adsMouseDelta).toBeGreaterThan(0);
 const adsRate=adsMouseDelta/adsInput;
 try{expect(adsRate).toBeLessThan(generalRate*.75);}
 catch(error){
  await test.info().attach('normalized-sensitivity-diagnostics',{body:JSON.stringify({generalRate,adsRate,generalInput,adsInput,generalDelta,adsDelta,generalMouseDelta,adsMouseDelta,state:await readInput()},null,2),contentType:'application/json'});
  throw error;
 }
});

test('ESC releases pointer lock for settings and a real canvas click reacquires it',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('project-duel-sensitivity',JSON.stringify({general:1,ads:.8})));
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/AI 대전 시작/}).click();
 await expect(page.locator('.scoreboard')).toBeVisible();
 const canvas=page.locator('canvas').first();
 await expect(canvas).toHaveAttribute('data-input-ready','true');
 await page.bringToFront();
 const box=await canvas.boundingBox();
 if(!box)throw new Error('game canvas has no bounds');
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===document.querySelector('canvas'))).toBe(true);
 await page.keyboard.press('Escape');
 await expect(page.getByRole('heading',{name:'게임 설정'})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null)).toBe(true);
 await page.getByRole('button',{name:'적용 후 닫기'}).click();
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===document.querySelector('canvas'))).toBe(true);
});

