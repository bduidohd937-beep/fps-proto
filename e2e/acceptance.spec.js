import {test,expect} from '@playwright/test';

const number=async(canvas,name)=>Number(await canvas.getAttribute(`data-acceptance${name.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase())}`));
test('browser measures authoritative posture camera heights, speeds and position convergence',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/AI 대전 시작/}).click();
 await expect(page.locator('.scoreboard')).toBeVisible();
 const canvas=page.locator('canvas').first();
 await expect(canvas).toHaveAttribute('data-controller-ready','true');
 await page.keyboard.press('F3');

 const sample=async(stance,key,speedRange,eye)=>{
  if(key)await page.keyboard.down(key);
  await page.keyboard.down('w');
  await expect(page.getByTestId('stance')).toHaveText(stance);
  let activeSpeed=0;
  await expect.poll(async()=>{activeSpeed=await number(canvas,'ServerSpeed');return activeSpeed>=speedRange[0]&&activeSpeed<=speedRange[1]},{timeout:5000}).toBe(true);
  const activeCameraEye=await number(canvas,'CameraEye'),activeServerEye=await number(canvas,'ServerEye');
  expect(activeCameraEye).toBeGreaterThan(eye-.16);
  expect(activeCameraEye).toBeLessThan(eye+.16);
  await page.keyboard.up('w');
  if(key)await page.keyboard.up(key);
  await expect.poll(()=>number(canvas,'PositionError'),{timeout:5000}).toBeLessThan(.55);
  return {speed:activeSpeed,cameraEye:activeCameraEye,serverEye:activeServerEye,positionError:await number(canvas,'PositionError'),speedMax:speedRange[1]};
 };
 const standing=await sample('지상',null,[4.1,6.4],1.55);
 const sprint=await sample('지상','Shift',[6.0,8.6],1.55);
 const crouched=await sample('앉기','c',[2.0,3.5],.96);
 await page.keyboard.press('z');
 const prone=await sample('엎드림',null,[.8,1.8],.42);
 for(const result of [standing,sprint,crouched,prone]){
  expect(Math.abs(result.cameraEye-result.serverEye)).toBeLessThan(.12);
  expect(result.positionError).toBeLessThan(.55);
  expect(result.speed).toBeLessThan(result.speedMax);
 }
});
