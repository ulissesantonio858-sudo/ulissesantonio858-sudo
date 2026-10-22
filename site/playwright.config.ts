import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests',
  reporter: 'list',
  use: { launchOptions: { executablePath: '/opt/pw-browsers/chromium' } },
})
