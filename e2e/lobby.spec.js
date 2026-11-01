import {test,expect} from '@playwright/test';

test('browser can create a room and a second client can join',async ({page,browser})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push('host: '+error.message));
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/친구 대전/}).click();
 await expect(page.getByRole('button',{name:'전장 생성',exact:false})).toBeEnabled();
 await page.getByRole('button',{name:'전장 생성',exact:false}).click();
 await expect(page.getByText('친구를 기다리는 중')).toBeVisible();
 const code=await page.locator('.invite-code').innerText();
 expect(code).toMatch(/^[A-Z2-9]{6}$/);
 const peerContext=await browser.newContext();
 const peer=await peerContext.newPage();
 peer.on('pageerror',error=>errors.push('peer: '+error.message));
 try{
  await peer.goto('/?room='+code);
  await expect(peer.locator('.menu-server.online')).toBeVisible();
  await expect(peer.getByRole('textbox',{name:'초대 코드'})).toHaveValue(code);
  await peer.getByRole('button',{name:'입장',exact:true}).click();
  await expect(peer.locator('.scoreboard')).toBeVisible();
  await expect(page.locator('.scoreboard')).toBeVisible();
  // Weapon slot is a real server-side inventory change, not just a visual highlight.
  await expect(page.getByRole('button',{name:'AR-4 장착'})).toHaveClass(/selected/);
  const hostCanvas=page.locator('canvas').first();
  await expect(hostCanvas).toHaveAttribute('data-controller-ready','true');
  await expect(hostCanvas).toHaveAttribute('data-input-ready','true');
  await page.bringToFront();
  await page.getByRole('button',{name:'VXR-9 장착'}).click();
  await expect(page.getByRole('button',{name:'VXR-9 장착'})).toHaveClass(/selected/);
  await expect(page.locator('.hud-module.ammo')).toContainText('VXR-9');
  await expect(page.locator('.hud-module.ammo')).toContainText('36');
  await page.getByRole('button',{name:'MKR-12 장착'}).click();
  await expect(page.getByRole('button',{name:'MKR-12 장착'})).toHaveClass(/selected/);
  await page.getByRole('button',{name:'BR-7 장착'}).click();
  await expect(page.getByRole('button',{name:'BR-7 장착'})).toHaveClass(/selected/);
  await page.getByRole('button',{name:'AR-4 장착'}).click();
  await expect(page.getByRole('button',{name:'AR-4 장착'})).toHaveClass(/selected/);
  // Real browser control must create actual server height, not a visual camera-only jump.
  await page.keyboard.down('Space');
  await expect.poll(async()=>Number(await page.getByTestId('altitude').getAttribute('data-y')),{timeout:4000}).toBeGreaterThan(.1);
  await page.keyboard.up('Space');
  await page.keyboard.down('c');
  await expect(page.getByTestId('stance')).toHaveText('앉기',{timeout:4000});
  await page.keyboard.up('c');
  expect(errors).toEqual([]);
 }finally{
  await peerContext.close();
 }
});

test('low graphics mode keeps room creation playable',async ({page})=>{
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 const setting=page.getByLabel('그래픽 품질');
 await setting.selectOption('low');
 await expect(setting).toHaveValue('low');
 await page.getByRole('button',{name:/친구 대전/}).click();
 await page.getByRole('button',{name:'전장 생성',exact:false}).click();
 await expect(page.getByText('친구를 기다리는 중')).toBeVisible();
 await expect(page.locator('canvas')).toBeVisible();
});
