import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
 testDir:'./e2e',
 timeout:45000,
 expect:{timeout:15000},
 fullyParallel:false,
 workers:1,
 retries:0,
 reporter:'list',
 use:{
  baseURL:'http://127.0.0.1:5273',
  trace:'retain-on-failure',
  screenshot:'only-on-failure',
  launchOptions:{args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 },
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 webServer:{
  command:'npm run dev',
  env:{WEB_PORT:'5273',GAME_PORT:'43271'},
  url:'http://127.0.0.1:5273/api/health',
  reuseExistingServer:false,
  timeout:120000
 }
});
