import {test,expect} from '@playwright/test';

test('solo mode starts immediately, without any second browser joining',async ({page})=>{
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await expect(page.getByRole('button',{name:/AI 대전 시작/})).toBeEnabled();
 await page.getByRole('button',{name:/AI 대전 시작/}).click();
 await expect(page.locator('.scoreboard')).toBeVisible({timeout:10000});
 await expect(page.locator('.room-label')).toContainText('SOLO / BOT');
 await expect(page.locator('.scoreboard')).toContainText('BOT');
 await expect(page.getByText('친구를 기다리는 중')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'AR-4 장착'})).toHaveClass(/selected/);
 await expect(page.locator('canvas')).toHaveAttribute('data-controller-ready','true');
 await page.keyboard.press('Digit2');
 await expect(page.getByRole('button',{name:'VXR-9 장착'})).toHaveClass(/selected/);
 expect(errors).toEqual([]);
});

test('friend waiting screen can swap to bot mode without inviting anybody',async ({page})=>{
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/친구 대전/}).click();
 await page.getByRole('button',{name:'전장 생성',exact:false}).click();
 await expect(page.getByText('친구를 기다리는 중')).toBeVisible();
 await page.getByRole('button',{name:/친구 대신 AI와 바로 플레이/}).click();
 await expect(page.locator('.scoreboard')).toBeVisible({timeout:10000});
 await expect(page.locator('.room-label')).toContainText('SOLO / BOT');
 await expect(page.getByText('친구를 기다리는 중')).toHaveCount(0);
});

test('operator preview selector updates with four different characters',async ({page})=>{
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/오퍼레이터/}).first().click();
 await page.getByRole('button',{name:/GHOST/}).click();
 await expect(page.getByRole('button',{name:/GHOST/})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.menu-personnel-card')).toContainText('GHOST');
 await page.getByRole('button',{name:/BULWARK/}).click();
 await expect(page.locator('.menu-personnel-card')).toContainText('BULWARK');
 await page.getByRole('button',{name:/HAWKEYE/}).click();
 await expect(page.locator('.menu-personnel-card')).toContainText('HAWKEYE');
 await page.reload();
 await expect(page.locator('.menu-personnel-card')).toContainText('HAWKEYE');
});

test('Z prone toggles authoritative position while F3 controls debug HUD visibility',async ({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/AI 대전 시작/}).click();
 await expect(page.locator('.scoreboard')).toBeVisible({timeout:10000});
 const stance=page.getByTestId('stance');
 await expect(page.locator('canvas')).toHaveAttribute('data-controller-ready','true');
 const debug=page.locator('.movement-status');
 await expect(debug).toHaveClass(/debug-hidden/);
 await page.keyboard.press('F3');
 await expect(debug).toBeVisible();
 await page.keyboard.press('z');
 await expect(stance).toHaveText('엎드림',{timeout:4000});
 await page.keyboard.press('z');
 await expect(stance).not.toHaveText('엎드림',{timeout:4000});
 await page.keyboard.press('F3');
 await expect(debug).toHaveClass(/debug-hidden/);
 expect(errors).toEqual([]);
});
