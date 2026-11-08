import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ApiDossier, ApiPieceJointe } from '../../../dossiers/domain/entities/dossier-api.entity';
import { DossierData } from '../../../dossiers/domain/entities/dossier.entity';
import { DossierApi } from '../../../dossiers/infrastructure/api/dossier.api';
import { EtatApi } from '../../../dossiers/infrastructure/api/etat.api';
import { SuiviAgenceApi } from '../api/suivi-agence.api';
import { BrouillonStore } from './brouillon.store';

const CREATED = {
  id: 'd-8',
  reference: 'DOS-00008',
  typeDossierId: 't-1',
  operationId: null,
  entiteEmettriceId: 'e-1',
  etatOrigineId: null,
  entiteTraitementId: null,
  statut: 'TEMPORAIRE',
  priorite: 'NORMALE',
  echeance: null,
  tiersNom: 'Kattou',
  tiersPrenom: 'Patricia',
  tiersNumero: '123456789012',
  objet: null,
  montant: null,
  donnees: {},
  note: null,
  comptes: [],
  affecteAId: null,
  affecteLe: null,
  creeLe: '2026-11-03T07:58:00Z',
  modifieLe: null,
} as ApiDossier;

const DATA = {
  num: '123456789012',
  prenom: 'Patricia',
  nom: 'Kattou',
  compte: '',
  client: 'Patricia Kattou',
  type: 'Ouverture de compte',
  produit: 'Compte courant',
  prio: 'Normale',
  note: '',
  pieces: [{ id: 'p-1', name: 'piece.pdf', file: new File(['x'], 'piece.pdf') }],
  extra: [],
  xraw: {},
} as unknown as DossierData;

describe('BrouillonStore', () => {
  it("n'ajoute pas deux fois un dossier relu par le temps réel pendant l'envoi de ses pièces", async () => {
    const upload = new Subject<ApiPieceJointe>();
    const dossierApi = {
      creer: vi.fn(() => of(CREATED)),
      ajouterPiece: vi.fn(() => upload),
      pieces: vi.fn(() => of([] as ApiPieceJointe[])),
      brouillon: vi.fn(() => of([CREATED])),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: DossierApi, useValue: dossierApi },
        { provide: EtatApi, useValue: { emis: () => of([]) } },
        {
          provide: SuiviAgenceApi,
          useValue: { dossiers: () => of({ dossiers: [], compteurs: [] }) },
        },
      ],
    });
    const store = TestBed.inject(BrouillonStore);

    const adding = store.add(DATA);
    // Signal « donnees:maj » reçu pendant l'envoi de la pièce : le brouillon est relu avec le nouveau dossier.
    await store.load();
    upload.next({} as ApiPieceJointe);
    upload.complete();
    await adding;

    expect(store.draft().map((dossier) => dossier.ref)).toEqual(['DOS-00008']);
  });

  it('ne transmet que les dossiers demandés et garde les autres dans le brouillon (MO-1)', async () => {
    const reclamation = { ...CREATED, id: 'd-9', reference: 'DOS-00009' };
    const etatApi = { emis: () => of([]), transmettre: vi.fn(() => of([])) };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DossierApi,
          useValue: {
            brouillon: () => of([CREATED, reclamation]),
            pieces: () => of([] as ApiPieceJointe[]),
          },
        },
        { provide: EtatApi, useValue: etatApi },
        {
          provide: SuiviAgenceApi,
          useValue: { dossiers: () => of({ dossiers: [], compteurs: [] }) },
        },
      ],
    });
    const store = TestBed.inject(BrouillonStore);
    await store.load();

    await store.transmit('te-1', ['d-8']);

    expect(etatApi.transmettre).toHaveBeenCalledWith('te-1', ['d-8']);
    expect(store.draft().map((dossier) => dossier.ref)).toEqual(['DOS-00009']);
  });
});
