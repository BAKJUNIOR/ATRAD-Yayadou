import { Browser, Page, expect } from '@playwright/test';

/** Mot de passe des comptes de démonstration, jamais écrit dans le dépôt. */
export const PASSWORD = process.env['DEMO_PASSWORD'] ?? '';

/** Ouvre une session dans un contexte de navigateur à part (un onglet = un utilisateur). */
export async function signIn(browser: Browser, matricule: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.getByLabel('Matricule').fill(matricule);
  await page.getByRole('textbox', { name: 'Mot de passe' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Session ouverte : l'application quitte la page de connexion pour l'accueil du profil.
  await page.waitForURL((url) => !url.pathname.startsWith('/signin'));
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
  return page;
}

/** Valide la boîte de dialogue ouverte (confirmation, action sur un dossier...). */
export async function confirmDialog(page: Page): Promise<void> {
  const button = page.locator('.dialog-confirm');
  await expect(button).toBeEnabled();
  await button.click();
  await expect(button).toBeHidden();
}

/** Numéro de 12 chiffres propre à chaque lancement, pour retrouver le dossier créé. */
export function uniqueClientNumber(): string {
  return String(Date.now()).padStart(12, '0').slice(-12);
}

/** Nom de client propre au lancement : le nom n'accepte que des lettres, les chiffres deviennent des lettres. */
export function uniqueName(prefix: string, client: string): string {
  return prefix + client.slice(-6).replace(/\d/g, (digit) => 'abcdefghij'[Number(digit)]);
}

/**
 * Agence : saisit une Demande de prêt dans le type d'état « Accueil central » et l'ajoute au brouillon.
 * Rend la référence attribuée par l'API (`DOS-00012`).
 */
export async function addLoanRequest(page: Page, client: string, nom: string): Promise<string> {
  await page.goto('/agence/creer-etat');
  await page.getByLabel("Type d'état de transmission").selectOption({ label: 'Accueil central' });
  await page.getByLabel('Type de dossier *').selectOption('Demande de prêt');
  await page.getByLabel('Numéro client').fill(client);
  await page.getByLabel('Nom du client', { exact: true }).fill(nom);
  await page.getByLabel(/Montant demandé/).fill('5000000');
  await page.getByLabel(/Durée souhaitée/).fill('36');
  await page.getByLabel(/Apport personnel/).fill('0');
  await page.getByRole('button', { name: "Ajouter à l'état de transmission" }).click();
  const row = page.locator('app-draft-etat li', { hasText: nom });
  await expect(row).toHaveCount(1);
  return (await row.locator('.font-mono').first().innerText()).trim();
}
