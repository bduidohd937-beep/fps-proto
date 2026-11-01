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
 await canvas.click();
 const before=Number(await canvas.getAttribute('data-acceptance-yaw'));
 await page.mouse.move(120,120,{steps:1});
 await expect.poll(async()=>Number(await canvas.getAttribute('data-acceptance-yaw'))).not.toBe(before);
 const generalDelta=Math.abs(Number(await canvas.getAttribute('data-acceptance-yaw'))-before);
 await page.mouse.down({button:'right'});
 const adsBefore=Number(await canvas.getAttribute('data-acceptance-yaw'));
 await page.mouse.move(220,120,{steps:1});
 await expect.poll(async()=>Number(await canvas.getAttribute('data-acceptance-yaw'))).not.toBe(adsBefore);
 const adsDelta=Math.abs(Number(await canvas.getAttribute('data-acceptance-yaw'))-adsBefore);
 await page.mouse.up({button:'right'});
 expect(adsDelta).toBeLessThan(generalDelta);
});
