import { TestBed } from '@angular/core/testing';
import { Account } from '../../../auth/domain/entities/account.entity';
import { DATASET_KEY } from '../../domain/datasets';
import { DossierData } from '../../domain/entities/dossier.entity';
import { Etat } from '../../domain/entities/etat.entity';
import { ReferentielStore } from './referentiel.store';
import { TransmissionStore } from './transmission.store';

const AGENT: Account = {
  id: 'u-1',
  role: 'agence',
  roles: ['agence'],
  ident: 'a.diallo',
  name: 'Aminata Diallo',
  roleLabel: '',
  entity: 'Agence Plateau (AG-014)',
  entityId: 'e-1',
};

function dossier(type: DossierData['type']): DossierData {
  return {
    num: '000123456789',
    prenom: 'Awa',
    nom: 'Sylla',
    compte: '',
    client: 'Awa Sylla',
    type,
    produit: 'Compte courant',
    prio: 'Normale',
    note: '',
    pieces: [],
    extra: [],
    xraw: {},
  };
}

describe('TransmissionStore', () => {
  let store: TransmissionStore;
  let referentiel: ReferentielStore;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(DATASET_KEY, 'neutre');
    referentiel = TestBed.inject(ReferentielStore);
    store = TestBed.inject(TransmissionStore);
  });

  /** Transmet le brouillon et renvoie le premier état produit. */
  function send(etatTypeId = 'TE-01'): Etat {
    const sent = store.transmit(AGENT, etatTypeId);
    if (!sent.ok) {
      throw new Error(sent.error);
    }
    return sent.etats[0];
  }

  it('refuses to transmit an empty state', () => {
    expect(store.transmit(AGENT, 'TE-01').ok).toBe(false);
  });

  it('numbers dossiers and dates the draft from its first dossier', () => {
    const first = store.addDossier(dossier('Réclamation'));
    const second = store.addDossier(dossier('Réclamation'));
    expect([first.ref, second.ref]).toEqual(['DOS-88201', 'DOS-88202']);
    expect(store.draftCreatedAt()).toBe(first.createdAt);

    store.removeDossier(first.id);
    store.removeDossier(second.id);
    expect(store.draftCreatedAt()).toBe('');
  });

  it('sends the draft to the receiving entity of the chosen state type', () => {
    store.addDossier(dossier('Demande de prêt'));
    store.addDossier(dossier('Ouverture de compte'));
    const expectedRef = store.draftRef();

    const etat = send('TE-01');

    expect(etat.ref).toBe(expectedRef);
    expect(etat.agence).toBe('Agence Plateau');
    expect(etat.code).toBe('AG-014');
    expect(etat.type).toBe('Mixte (2 types)');
    expect(etat.etType).toBe('TE-01');
    expect(etat.recep).toBe('EC-001');
    expect(etat.dest).toBe('Accueil central (EC-001)');
    expect(etat.dossiers.every((d) => d.status === 'Transmis')).toBe(true);
    expect(store.draft()).toEqual([]);
    expect(store.draftRef()).not.toBe(expectedRef);
  });

  it('blocks a dossier that the chosen state type does not accept', () => {
    store.addDossier(dossier('Réclamation'));
    const result = store.transmit(AGENT, 'TE-01');
    expect(result.ok).toBe(false);
    expect(store.draft()).toHaveLength(1);
  });

  it('produces one state per state type in automatic mode', () => {
    referentiel.save({ saisieMode: 'auto' });
    store.addDossier(dossier('Réclamation'));
    store.addDossier(dossier('Demande de prêt'));

    const sent = store.transmit(AGENT, '');

    expect(sent.ok && sent.etats.map((etat) => [etat.etType, etat.recep])).toEqual([
      ['TE-02', 'ET-020'],
      ['TE-01', 'EC-001'],
    ]);
  });

  it('dispatches received dossiers and keeps the others as not received', () => {
    store.addDossier(dossier('Demande de prêt'));
    store.addDossier(dossier('Ouverture de compte'));
    const etat = send();
    const [pret, ouverture] = etat.dossiers;

    const result = store.receive(etat.ref, [pret.ref], 'Moussa Koné', 'EC-001');

    expect(result).toEqual({
      ok: true,
      received: 1,
      missing: 1,
      routing: 'Crédits (1)',
      allDirect: false,
    });
    expect(store.etats()[0].status).toBe('Reçu partiellement');
    expect(store.etats()[0].dossiers.find((d) => d.ref === ouverture.ref)?.nonRec?.by).toBe(
      'Moussa Koné',
    );
    // Le Service Crédits passe par un répartiteur : le dossier attend dans le bac.
    const credit = store.dossiers()[0];
    expect(credit.entite).toBe('Service Crédits (ET-007)');
    expect(credit.direct).toBe(false);
    expect(credit.gest).toBe('');
    expect(credit.status).toBe('Reçu');

    store.receive(etat.ref, [ouverture.ref], 'Moussa Koné', 'EC-001');
    expect(store.etats()[0].status).toBe('Reçu');
  });

  it('lets a receiving entity that also processes take its dossiers in charge directly', () => {
    store.addDossier(dossier('Réclamation'));
    const etat = send('TE-02');

    const result = store.receive(etat.ref, [etat.dossiers[0].ref], 'Fatou Bamba', 'ET-020');

    expect(result.ok && result.allDirect).toBe(true);
    const routed = store.dossiers()[0];
    expect(routed.entite).toBe('Service Réclamations (ET-020)');
    expect(routed.affectedBy).toBe('Réception directe');
    // Répartition automatique du Service Réclamations : un gestionnaire est déjà désigné.
    expect(routed.gest).toBe('Fatou Bamba');
    expect(routed.status).toBe('En cours');
  });

  it('refuses a reception by another entity than the receiving one', () => {
    store.addDossier(dossier('Demande de prêt'));
    const etat = send();
    const result = store.receive(etat.ref, [etat.dossiers[0].ref], 'Fatou Bamba', 'ET-020');
    expect(result.ok).toBe(false);
    expect(store.dossiers()).toEqual([]);
  });

  it('blocks the reception of a dossier type without processing entity', () => {
    store.addDossier(dossier('Demande de prêt'));
    const etat = send();
    const circuits = referentiel.value().circuits;
    referentiel.save({
      circuits: { ...circuits, 'Demande de prêt': { et: 'TE-01', trait: '', check: false } },
    });

    const result = store.receive(etat.ref, [etat.dossiers[0].ref], 'Moussa Koné', 'EC-001');

    expect(result.ok).toBe(false);
    expect(store.etats()[0].status).toBe('Transmis');
  });

  it('applies processing actions only where the circuit allows them', () => {
    store.addDossier(dossier('Demande de prêt'));
    const etat = send();
    store.receive(etat.ref, [etat.dossiers[0].ref], 'Moussa Koné', 'EC-001');
    const id = store.dossiers()[0].id;

    // Clôturer avant validation est refusé par le circuit.
    expect(store.applyAction(id, { kind: 'cloturer' }, 'Fatou Bamba').ok).toBe(false);

    expect(store.assign(id, 'Fatou Bamba', 'Éric Tanoh').ok).toBe(true);
    expect(store.dossiers()[0].status).toBe('En cours');

    store.applyAction(id, { kind: 'rejet_info', docs: ['Relevés bancaires'], note: '' }, 'Fatou');
    expect(store.dossiers()[0].status).toBe('En attente de document(s) complémentaire(s)');

    store.applyAction(id, { kind: 'retour_docs', reason: '' }, 'Fatou');
    const returned = store.dossiers()[0];
    expect(returned.status).toBe('Dossier retourné');
    expect(returned.complements).toBe('Relevés bancaires');
    // Un dossier retourné n'accepte plus d'action de l'entité…
    expect(store.applyAction(id, { kind: 'valider' }, 'Fatou').ok).toBe(false);
    // …et c'est l'entité réceptrice qui le renvoie à l'entité émettrice.
    expect(store.renvoyer([id], 'Moussa Koné')).toHaveLength(1);
    expect(store.dossiers()[0].status).toBe('Retourné en agence');
  });

  it('ignores a reception with no dossier checked', () => {
    store.addDossier(dossier('Demande de prêt'));
    const etat = send();
    expect(store.receive(etat.ref, [], 'Moussa Koné', 'EC-001').ok).toBe(false);
  });
});
