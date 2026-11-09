import { expect, test } from '@playwright/test';
import { addLoanRequest, confirmDialog, signIn, uniqueClientNumber, uniqueName } from './support';

test('Recherche : un état retrouvé par le nom du client puis par son numéro', async ({
  browser,
}) => {
  const client = uniqueClientNumber();
  const nom = uniqueName('Recherche', client);

  const agence = await signIn(browser, 'a.diallo');
  const dossier = await addLoanRequest(agence, client, nom);
  await expect(agence.locator('app-draft-etat tbody tr')).toHaveCount(1);
  await agence.getByRole('button', { name: /Valider et transmettre/ }).click();
  await confirmDialog(agence);
  const transmis = agence.locator('app-etat-transmis');
  await expect(transmis).toContainText(/ET-\d{4}-\d{4}/);
  const etat = (await transmis.innerText()).match(/ET-\d{4}-\d{4}/)![0];

  await agence.getByRole('link', { name: 'Recherche', exact: true }).click();
  await expect(agence.getByRole('radio', { name: 'Code agence' })).toHaveCount(0);
  await agence.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(agence.getByRole('alert')).toContainText('Saisissez le numéro de compte');

  await agence.getByRole('radio', { name: 'Nom client' }).check();
  await expect(agence.getByRole('radio', { name: 'Nom client' })).toBeChecked();
  await agence.getByLabel('Nom ou prénom du client').fill(`awa ${nom.toLowerCase()}`);
  const reponse = agence.waitForResponse((r) => r.url().includes('/api/v1/recherche/etats'));
  await agence.getByRole('button', { name: 'Rechercher', exact: true }).click();
  const etats = await reponse;
  const corps = await etats.text();
  expect(etats.ok(), `${etats.url()} → ${corps}`).toBe(true);
  expect(JSON.parse(corps).data.totalElements, `${etats.url()} → ${corps}`).toBe(1);
  await expect(agence.getByRole('tab', { name: 'États (1)' })).toBeVisible();
  const ligne = agence.getByRole('row', { name: new RegExp(etat) });
  await expect(ligne).toContainText('Non reçu');
  await ligne.getByRole('button', { name: `Voir l'état ${etat}` }).click();
  const apercu = agence.getByRole('dialog');
  await expect(apercu).toContainText(dossier);
  await expect(apercu).toContainText(nom);
  await apercu.getByRole('button', { name: 'Fermer' }).last().click();

  const accueil = await signIn(browser, 'm.kone');
  await accueil.goto('/recherche');
  await accueil.getByRole('radio', { name: 'N° état' }).check();
  await accueil.getByLabel("Numéro de l'état").fill(etat);
  await accueil.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(accueil.getByRole('tab', { name: 'États (1)' })).toBeVisible();
  await expect(accueil.getByRole('row', { name: new RegExp(etat) })).toContainText(
    'Agence Plateau',
  );
});
