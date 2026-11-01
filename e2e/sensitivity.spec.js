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

test('Pointer Lock lifecycle supports ESC settings access and reacquisition',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/AI 대전 시작/}).click();
 await expect(page.locator('.scoreboard')).toBeVisible();
 const canvas=page.locator('canvas').first();
 await expect(canvas).toHaveAttribute('data-input-ready','true');
 const box=await canvas.boundingBox();
 if(!box)throw new Error('game canvas has no bounds');
 const x=box.x+box.width/2,y=box.y+box.height/2;
 await page.mouse.click(x,y);
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===document.querySelector('canvas'))).toBe(true);
 await expect(canvas).toHaveAttribute('data-acceptance-pointer-lock','locked');
 await page.keyboard.press('Escape');
 await expect(page.getByRole('heading',{name:'게임 설정'})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null)).toBe(true);
 await page.getByRole('button',{name:'적용 후 닫기'}).click();
 await page.mouse.click(x,y);
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===document.querySelector('canvas'))).toBe(true);
 await expect(canvas).toHaveAttribute('data-acceptance-pointer-lock','locked');
 await page.mouse.down({button:'right'});
 await expect(canvas).toHaveAttribute('data-acceptance-aim','ads');
 await page.mouse.up({button:'right'});
 await expect(canvas).toHaveAttribute('data-acceptance-aim','general');
});
test('mousemove delivery is diagnosed separately from deterministic sensitivity math',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/AI 대전 시작/}).click();
 await expect(page.locator('.scoreboard')).toBeVisible();
 const canvas=page.locator('canvas').first();
 await expect(canvas).toHaveAttribute('data-input-ready','true');
 const box=await canvas.boundingBox();
 if(!box)throw new Error('game canvas has no bounds');
 const x=Math.floor(box.x+box.width/2),y=Math.floor(box.y+box.height/2);
 await page.evaluate(()=>{
  window.__duelMouseDiagnostics={browserEvents:0};
  document.addEventListener('mousemove',event=>{
   window.__duelMouseDiagnostics.browserEvents+=1;
   window.__duelMouseDiagnostics.lastMovementX=event.movementX;
   window.__duelMouseDiagnostics.lastMovementY=event.movementY;
  },true);
 });
 await page.mouse.click(x,y);
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===document.querySelector('canvas'))).toBe(true);
 await page.mouse.move(x+160,y,{steps:8});
 await page.waitForTimeout(250);
 const diagnostic=await page.evaluate(()=>{
  const canvas=document.querySelector('canvas'),browser=window.__duelMouseDiagnostics;
  const gameEvents=Number(canvas?.dataset.acceptanceMouseEvents||0);
  return {pointerLock:document.pointerLockElement===canvas,browserEvents:browser.browserEvents,
   gameEvents,movementX:Number(canvas?.dataset.acceptanceMouseTotalX||0),
   classification:browser.browserEvents===0?'browser-delivery-not-observed':gameEvents===0?'game-listener-not-observing':'game-input-observed'};
 });
 await test.info().attach('mousemove-delivery-diagnostic',{body:JSON.stringify(diagnostic,null,2),contentType:'application/json'});
 expect(diagnostic.pointerLock).toBe(true);
 expect(['browser-delivery-not-observed','game-listener-not-observing','game-input-observed']).toContain(diagnostic.classification);
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

