import {test,expect} from '@playwright/test';

test('health failure stays explicit and never renders expensive preview',async({page})=>{
 await page.route('**/api/health',route=>route.abort());
 await page.goto('/');
 await expect(page.getByRole('status')).toContainText('상태 확인에 실패');
 await expect(page.locator('.menu-server.online')).toHaveCount(0);
 await expect(page.locator('canvas')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/AI 대전 시작/})).toBeDisabled();
});
test('wrong server version is rejected',async({page})=>{
 await page.route('**/api/health',route=>route.fulfill({json:{service:'project-duel',version:'wrong',protocol:6}}));
 await page.goto('/');
 await expect(page.getByRole('status')).toContainText('버전과 일치하지');
 await expect(page.locator('.menu-server.online')).toHaveCount(0);
});
for(const difficulty of ['rookie','regular'])test(`${difficulty}: real keyboard movement, prone, jump and reconnect`,async({page,context})=>{
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByLabel('AI 난이도').selectOption(difficulty);
 await page.getByRole('button',{name:/AI 대전 시작/}).click();
 await expect(page.locator('.scoreboard')).toBeVisible();
 await expect(page.locator('canvas')).toHaveAttribute('data-controller-ready','true');
 await page.keyboard.press('F3');
 await page.keyboard.down('w');
 await page.keyboard.down('Shift');
 await page.keyboard.down('c');
 await expect(page.getByTestId('stance')).toHaveText('앉기');
 await page.keyboard.up('c');await page.keyboard.up('Shift');await page.keyboard.up('w');
 await page.keyboard.press('z');
 await expect(page.getByTestId('stance')).toHaveText('엎드림');
 await page.keyboard.down('Space');
 await expect(page.getByTestId('altitude')).toHaveAttribute('data-y','0.00');
 await page.keyboard.up('Space');await page.keyboard.press('z');
 await expect(page.getByTestId('stance')).toHaveText('지상');
 await page.keyboard.down('Space');
 await expect.poll(async()=>Number(await page.getByTestId('altitude').getAttribute('data-y'))).toBeGreaterThan(.1);
 await page.keyboard.up('Space');
 await context.setOffline(true);
 // Force transport closure instead of waiting for Socket.IO heartbeat timeout.
 await page.reload().catch(()=>{});
 await context.setOffline(false);
 await page.goto('/');
 await expect(page.locator('.menu-server.online')).toBeVisible();
 await page.getByRole('button',{name:/AI 대전 시작/}).click();
 await expect(page.locator('.scoreboard')).toBeVisible();
});
