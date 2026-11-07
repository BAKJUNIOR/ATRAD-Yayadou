import { Page, expect, test } from '@playwright/test';
import { confirmDialog, signIn } from './support';

async function openReclamation(admin: Page): Promise<void> {
  await admin.goto('/administration/formulaires');
  await admin
    .getByRole('combobox', { name: /^Type de dossier/ })
    .selectOption({ label: 'Réclamation' });
  await expect(admin.getByRole('heading', { name: 'Champs propres' })).toBeVisible();
}

test("l'administrateur ajoute un champ à un type de dossier, l'agence le saisit", async ({
  browser,
}) => {
  const admin = await signIn(browser, 'admin');
  await openReclamation(admin);
  const champs = admin.locator('li').filter({ has: admin.getByPlaceholder('Ex. Montant demandé') });
  const avant = await champs.count();
  await admin.getByRole('button', { name: 'Ajouter un champ' }).click();
  // Le nouveau champ doit être affiché avant d'être rempli (sinon la saisie irait dans le précédent).
  await expect(champs).toHaveCount(avant + 1);
  const champ = champs.nth(avant);
  await champ.getByLabel('Libellé *').fill('Canal de contact');
  await champ.getByLabel('Type de donnée').selectOption('LISTE');
  await champ.getByLabel(/Valeurs proposées/).fill('Agence\nTéléphone');
  await admin.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await confirmDialog(admin);
  await expect(admin.getByText('Formulaire « Réclamation » enregistré.')).toBeVisible();

  const agence = await signIn(browser, 'a.diallo');
  await agence.goto('/agence/creer-etat');
  await agence.getByLabel("Type d'état de transmission").selectOption({ label: 'Réclamations' });
  await agence.getByLabel('Type de dossier *').selectOption('Réclamation');
  await expect(agence.getByLabel(/Canal de contact/)).toBeVisible();

  await openReclamation(admin);
  await admin.getByRole('button', { name: 'Retirer le champ Canal de contact' }).click();
  await admin.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await confirmDialog(admin);
  await expect(admin.getByText('Formulaire « Réclamation » enregistré.')).toBeVisible();
});
