import { TestBed } from '@angular/core/testing';
import { Account } from '../../../auth/domain/entities/account.entity';
import { DossierData } from '../../domain/entities/dossier.entity';
import { TransmissionStore } from './transmission.store';

const AGENT: Account = {
  role: 'agence',
  ident: 'a.diallo',
  name: 'Aminata Diallo',
  roleLabel: '',
  entity: 'Agence Plateau (AG-014)',
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

  beforeEach(() => {
    localStorage.clear();
    store = TestBed.inject(TransmissionStore);
  });

  it('refuses to transmit an empty state', () => {
    expect(store.transmit(AGENT).ok).toBe(false);
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

  it('transmits the draft as a new state and empties it', () => {
    store.addDossier(dossier('Réclamation'));
    store.addDossier(dossier('Demande de prêt'));
    const expectedRef = store.draftRef();

    const result = store.transmit(AGENT);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.etat.ref).toBe(expectedRef);
      expect(result.etat.agence).toBe('Agence Plateau');
      expect(result.etat.code).toBe('AG-014');
      expect(result.etat.type).toBe('Mixte (2 types)');
      expect(result.etat.dossiers.every((d) => d.status === 'Transmis')).toBe(true);
    }
    expect(store.draft()).toEqual([]);
    expect(store.draftRef()).not.toBe(expectedRef);
  });
});
