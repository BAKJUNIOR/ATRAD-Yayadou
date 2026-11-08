import { expect, test } from '@playwright/test';
import { addLoanRequest, signIn, uniqueClientNumber, uniqueName } from './support';

test.describe("Saisie d'un état de transmission", () => {
  test("MO-1 : changer de type d'état garde les dossiers déjà saisis", async ({ browser }) => {
    const page = await signIn(browser, 'a.diallo');
    const client = uniqueClientNumber();
    const nom = uniqueName('Brouillon', client);
    const dossier = await addLoanRequest(page, client, nom);

    await page.getByLabel("Type d'état de transmission").selectOption({ label: 'Réclamations' });
    await expect(page.locator('.dialog-confirm')).toBeHidden();
    await expect(page.locator('app-draft-etat')).not.toContainText(dossier);
    await expect(page.locator('app-draft-etat')).toContainText(
      'Autre état en cours : « Accueil central »',
    );

    await page.locator('app-draft-etat').getByRole('button', { name: 'Afficher' }).click();
    await expect(page.locator('app-draft-etat')).toContainText(dossier);
    await page
      .locator('app-draft-etat tbody tr', { hasText: nom })
      .getByRole('button')
      .last()
      .click();
    await page.locator('.dialog-confirm').click();
    await expect(page.locator('app-draft-etat')).not.toContainText(dossier);
  });

  test('MO-4 : un dossier avec pièce jointe ne figure qu’une fois dans le brouillon', async ({
    browser,
  }) => {
    const page = await signIn(browser, 'a.diallo');
    const client = uniqueClientNumber();
    const nom = uniqueName('Piece', client);
    await page.goto('/agence/creer-etat');
    await page.getByLabel("Type d'état de transmission").selectOption({ label: 'Accueil central' });
    await page.getByLabel('Type de dossier *').selectOption('Demande de prêt');
    await page.getByLabel('Numéro client').fill(client);
    await page.getByLabel('Nom du client', { exact: true }).fill(nom);
    await page.getByLabel('N° de compte').fill('00012345678');
    await page.getByLabel(/Montant demandé/).fill('5000000');
    await page.getByLabel(/Durée souhaitée/).fill('36');
    await page.getByLabel(/Apport personnel/).fill('0');
    await page.locator('input[type=file]').setInputFiles({
      name: 'piece.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n% piece de test\n'),
    });
    await page.getByRole('button', { name: "Ajouter à l'état de transmission" }).click();

    const rows = page.locator('app-draft-etat tbody tr', { hasText: nom });
    await expect(rows).toHaveCount(1);
    // Le temps réel relit le brouillon après coup : toujours une seule ligne.
    await page.waitForTimeout(1500);
    await expect(rows).toHaveCount(1);

    await rows.getByRole('button').last().click();
    await page.locator('.dialog-confirm').click();
    await expect(rows).toHaveCount(0);
  });

  test('le n° de compte ne garde que 11 chiffres', async ({ browser }) => {
    const page = await signIn(browser, 'a.diallo');
    await page.goto('/agence/creer-etat');
    const compte = page.getByLabel('N° de compte');
    await compte.pressSequentially('CPT-123456789012');
    await expect(compte).toHaveValue('12345678901');
    await expect(page.getByLabel('Priorité')).toHaveCount(0);
  });
});
