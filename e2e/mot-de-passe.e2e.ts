import { expect, test } from '@playwright/test';
import { PASSWORD } from './support';

const MATRICULE = 'i.ouedraogo';
const EMAIL = 'i.ouedraogo@exemple.test';
const TEMPORAIRE = 'Temporaire-E2e9!';
const MAILPIT = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';

/** Dernier lien de réinitialisation reçu par l'adresse, lu dans Mailpit (SMTP local). */
async function lienRecu(request: import('@playwright/test').APIRequestContext, depuis: number) {
  let jeton = '';
  await expect
    .poll(
      async () => {
        const recherche = await request.get(`${MAILPIT}/api/v1/search`, {
          params: { query: `to:"${EMAIL}"` },
        });
        const messages: { ID: string; Created: string }[] = (await recherche.json()).messages ?? [];
        const recent = messages.find((message) => Date.parse(message.Created) >= depuis);
        if (!recent) {
          return '';
        }
        const message = await (await request.get(`${MAILPIT}/api/v1/message/${recent.ID}`)).json();
        jeton = (message.HTML as string).match(/jeton=([\w-]+)/)?.[1] ?? '';
        return jeton;
      },
      { timeout: 15_000 },
    )
    .not.toBe('');
  return jeton;
}

test('mot de passe oublié : lien reçu par e-mail, nouveau mot de passe, lien à usage unique', async ({
  page,
  request,
}) => {
  const depuis = Date.now() - 1000;
  await page.goto('/signin');
  await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click();
  // La page de connexion a aussi un champ « Matricule » : attendre la nouvelle page avant de saisir.
  await page.waitForURL('**/mot-de-passe-oublie');
  await expect(page.getByRole('heading', { name: 'Mot de passe oublié' })).toBeVisible();
  await page.getByLabel('Matricule').fill(MATRICULE);
  await page.getByLabel('Adresse e-mail professionnelle').fill('autre@exemple.test');
  const refus = page.waitForResponse(
    (reponse) =>
      reponse.url().includes('/auth/mot-de-passe-oublie') && reponse.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Recevoir le lien' }).click();
  expect((await refus).status()).toBe(400);
  await expect(page.getByText('Aucun compte actif ne correspond')).toBeVisible();

  await page.getByLabel('Adresse e-mail professionnelle').fill(EMAIL);
  await page.getByRole('button', { name: 'Recevoir le lien' }).click();
  await expect(page.getByText(`E-mail envoyé à ${EMAIL}`)).toBeVisible();

  const jeton = await lienRecu(request, depuis);
  await page.goto(`/reinitialiser-mot-de-passe?jeton=${jeton}`);
  await page.locator('#reset-password').fill(TEMPORAIRE);
  await page.locator('#reset-confirmation').fill(TEMPORAIRE);
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click();
  await expect(page.getByText('Mot de passe modifié : connectez-vous')).toBeVisible();

  await page.getByLabel('Matricule').fill(MATRICULE);
  await page.getByRole('textbox', { name: 'Mot de passe' }).fill(TEMPORAIRE);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.locator('.dialog-confirm').click();
  await page.waitForURL((url) => url.pathname.startsWith('/signin'));

  // Le compte de démonstration retrouve son mot de passe habituel.
  const connexion = await request.post('/api/v1/auth/login', {
    data: { identifiant: MATRICULE, motDePasse: TEMPORAIRE },
  });
  const jwt = (await connexion.json()).data.accessToken as string;
  const retour = await request.put('/api/v1/moi/mot-de-passe', {
    headers: { Authorization: `Bearer ${jwt}` },
    data: { motDePasseActuel: TEMPORAIRE, nouveauMotDePasse: PASSWORD, confirmation: PASSWORD },
  });
  expect(retour.ok(), await retour.text()).toBe(true);

  await page.goto(`/reinitialiser-mot-de-passe?jeton=${jeton}`);
  await page.locator('#reset-password').fill(TEMPORAIRE);
  await page.locator('#reset-confirmation').fill(TEMPORAIRE);
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click();
  await expect(page.getByText("Ce lien n'est plus valable")).toBeVisible();
});
