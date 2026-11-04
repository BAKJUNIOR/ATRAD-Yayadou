import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout (`npm run e2e`) : le front servi par `ng serve` (relais /api et /ws) contre une API
 * démarrée à part avec les données de démonstration. Comptes de démo, mot de passe dans `DEMO_PASSWORD`.
 * Les parcours modifient la base : ils s'exécutent un par un.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4200',
    locale: 'fr-FR',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Vidéo dans la CI seulement (Playwright y installe ffmpeg).
    video: process.env['CI'] ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      // En local, le Chrome installé ; dans la CI, le Chromium de Playwright.
      use: { ...devices['Desktop Chrome'], channel: process.env['CI'] ? undefined : 'chrome' },
    },
  ],
});
