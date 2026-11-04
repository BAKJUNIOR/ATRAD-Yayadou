import { expect, test } from '@playwright/test';
import { PASSWORD, signIn } from './support';

test.describe('Connexion', () => {
  test('refuse un mauvais mot de passe', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Matricule').fill('a.diallo');
    await page.getByRole('textbox', { name: 'Mot de passe' }).fill(`${PASSWORD}-faux`);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText('Matricule ou mot de passe incorrect')).toBeVisible();
  });

  test("ouvre l'espace de l'agence, sous le nom MOSAIC et avec le vocabulaire « Client »", async ({
    browser,
  }) => {
    const page = await signIn(browser, 'a.diallo');
    await expect(page.getByText('Aminata Diallo').first()).toBeVisible();
    await expect(page).toHaveTitle(/MOSAIC/);

    await page.goto('/agence/suivi');
    await expect(page.getByLabel('Nom ou prénom du client')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/\btiers\b/i);
  });
});
