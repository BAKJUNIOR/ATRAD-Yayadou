import { expect, test } from '@playwright/test';
import { addLoanRequest, confirmDialog, signIn, uniqueClientNumber, uniqueName } from './support';

test("Demande de prêt : de l'agence à la clôture", async ({ browser }) => {
  const client = uniqueClientNumber();
  const nom = uniqueName('Parcours', client);

  // L'Accueil central est déjà sur sa liste : le nouvel état doit y arriver sans rechargement.
  const accueil = await signIn(browser, 'm.kone');
  await accueil.goto('/accueil-central/etats-recus');
  await accueil.waitForLoadState('networkidle');
  const enAttente = accueil.getByText(/\d+ en attente de réception/);
  const avant = (await enAttente.count())
    ? Number((await enAttente.innerText()).match(/\d+/)![0])
    : 0;

  // 1. Agence : saisie puis transmission.
  const agence = await signIn(browser, 'a.diallo');
  const dossier = await addLoanRequest(agence, client, nom);
  // La transmission envoie tout le brouillon : le test s'arrête plutôt que d'envoyer d'autres dossiers.
  await expect(agence.locator('app-draft-etat tbody tr')).toHaveCount(1);
  await agence.getByRole('button', { name: /Valider et transmettre/ }).click();
  await confirmDialog(agence);
  const transmis = agence.locator('app-etat-transmis');
  await expect(transmis).toContainText(/ET-\d{4}-\d{4}/);
  const etat = (await transmis.innerText()).match(/ET-\d{4}-\d{4}/)![0];

  // 2. Accueil : le compteur augmente en temps réel, sans recharger ; l'état est retrouvé puis pointé reçu.
  await expect(enAttente).toHaveText(`${avant + 1} en attente de réception`, { timeout: 15_000 });
  await accueil.getByPlaceholder('Ex. ET-2026-0401').fill(etat);
  await accueil.getByRole('button', { name: 'Rechercher', exact: true }).click();
  // Un seul résultat : l'état s'ouvre directement ; sinon on l'ouvre depuis la liste.
  await expect(accueil.getByText(etat).first()).toBeVisible();
  const ouvrir = accueil.getByRole('button', { name: `Ouvrir l'état ${etat}` });
  if (await ouvrir.isVisible()) {
    await ouvrir.click();
  }
  await accueil.getByRole('checkbox', { name: `Dossier ${dossier} reçu` }).check();
  await accueil.getByRole('button', { name: /Confirmer la réception/ }).click();
  if (await accueil.locator('.dialog-confirm').isVisible()) {
    await confirmDialog(accueil);
  }

  // 3. Répartiteur du Service Crédits : affectation à Fatou Bamba.
  const repartiteur = await signIn(browser, 'e.tanoh');
  await repartiteur.goto('/traitement/affectation');
  const gestionnaire = repartiteur.getByLabel(`Gestionnaire pour ${dossier}`);
  await expect(gestionnaire).toBeVisible({ timeout: 15_000 });
  await gestionnaire.selectOption({ label: 'Fatou Bamba' });
  await repartiteur
    .getByRole('row', { name: new RegExp(dossier) })
    .getByRole('button', { name: 'Affecter' })
    .click();
  if (await repartiteur.locator('.dialog-confirm').isVisible()) {
    await confirmDialog(repartiteur);
  }

  // 4. Gestionnaire : validation puis clôture.
  const gestion = await signIn(browser, 'f.bamba');
  await gestion.goto('/traitement/mes-dossiers');
  await gestion.getByText(dossier, { exact: true }).click();
  await gestion.getByRole('button', { name: 'Valider le dossier' }).click();
  await confirmDialog(gestion);
  await gestion.getByRole('button', { name: 'Clôturer le dossier' }).click();
  await confirmDialog(gestion);

  // 5. Agence : le dossier est clôturé dans son suivi.
  await agence.goto('/agence/suivi');
  await expect(agence.getByRole('row', { name: new RegExp(dossier) })).toContainText('Clôturé', {
    timeout: 15_000,
  });
});
