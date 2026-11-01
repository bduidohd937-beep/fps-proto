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
