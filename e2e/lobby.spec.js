import {test,expect} from '@playwright/test';

test('browser can create a room and a second client can join',async ({page,browser})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push('host: '+error.message));
 await page.goto('/');
 await expect(page.getByText('게임 서버 연결됨')).toBeVisible();
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
  await expect(peer.getByText('게임 서버 연결됨')).toBeVisible();
  await expect(peer.getByRole('textbox',{name:'초대 코드'})).toHaveValue(code);
  await peer.getByRole('button',{name:'입장',exact:true}).click();
  await expect(peer.locator('.scoreboard')).toBeVisible();
  await expect(page.locator('.scoreboard')).toBeVisible();
  expect(errors).toEqual([]);
 }finally{
  await peerContext.close();
 }
});
