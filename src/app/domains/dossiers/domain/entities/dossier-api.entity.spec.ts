import { setReferentiel, defaultReferentiel } from '../referentiel';
import {
  ApiDossier,
  ApiEtat,
  brouillonOf,
  dossierFromApi,
  etatFromApi,
  statusOf,
} from './dossier-api.entity';

const api: ApiDossier = {
  id: 'd-1',
  reference: 'DOS-00012',
  typeDossierId: 'td-pret',
  operationId: 'op-habitat',
  entiteEmettriceId: 'b-plateau',
  etatOrigineId: null,
  entiteTraitementId: null,
  statut: 'TEMPORAIRE',
  priorite: 'HAUTE',
  echeance: null,
  tiersNom: 'Diallo',
  tiersPrenom: 'Awa',
  tiersNumero: '000123456789',
  objet: null,
  montant: 5000000,
  donnees: { montantPret: 5000000, duree: 36 },
  note: 'Urgent',
  comptes: [{ role: 'AUTRE', numero: 'CPT-0012345', cle: null, intitule: null }],
  affecteAId: null,
  affecteLe: null,
  creeLe: '2026-10-30T08:00:00Z',
  modifieLe: null,
};

describe('dossier-api.entity', () => {
  beforeEach(() => {
    setReferentiel({
      ...defaultReferentiel(),
      entites: [
        {
          id: 'b-plateau',
          code: 'AG-014',
          nom: 'Agence Plateau',
          nature: 'Agence',
          emet: true,
          recep: false,
          trait: false,
        },
        {
          id: 'b-accueil',
          code: 'EC-001',
          nom: 'Accueil central',
          nature: 'Service',
          emet: false,
          recep: true,
          trait: false,
        },
        {
          id: 'b-credits',
          code: 'ET-007',
          nom: 'Service Crédits',
          nature: 'Service',
          emet: false,
          recep: false,
          trait: true,
        },
      ],
      dossierTypes: ['Demande de prêt'],
      typeIds: { 'Demande de prêt': 'td-pret' },
      typeFields: {
        'Demande de prêt': [
          { key: 'montantPret', label: 'Montant du prêt', kind: 'number', unit: 'FCFA' },
          { key: 'duree', label: 'Durée', kind: 'number', unit: 'mois' },
        ],
      },
      typePieces: {},
      typeOperations: { 'Demande de prêt': [{ id: 'op-habitat', label: 'Prêt habitat' }] },
    });
  });

  afterEach(() => setReferentiel(defaultReferentiel()));

  it('should map API status codes to the front labels', () => {
    expect(statusOf('EN_ATTENTE_DOCUMENTS')).toBe('En attente de document(s) complémentaire(s)');
    expect(statusOf('RETOURNE_EN_AGENCE')).toBe('Retourné en agence');
    expect(statusOf('RECU_PARTIELLEMENT')).toBe('Reçu partiellement');
  });

  it('should rebuild a front dossier with its product, account, fields and pieces', () => {
    const dossier = dossierFromApi(api, [
      {
        id: 'p-1',
        nomFichier: 'rib.pdf',
        typeMime: 'application/pdf',
        tailleOctets: 120,
        ajouteLe: '2026-10-30T08:01:00Z',
        ajouteParId: 'u-1',
        ajoutePar: 'Aminata Diallo',
      },
    ]);
    expect(dossier).toMatchObject({
      id: 'd-1',
      ref: 'DOS-00012',
      type: 'Demande de prêt',
      produit: 'Prêt habitat',
      compte: 'CPT-0012345',
      client: 'Awa Diallo',
      prio: 'Haute',
      montant: '5 000 000 FCFA',
      xraw: { montantPret: '5000000', duree: '36' },
    });
    expect(dossier.extra).toEqual([
      { label: 'Montant du prêt', value: '5 000 000 FCFA' },
      { label: 'Durée', value: '36 mois' },
    ]);
    expect(dossier.pieces[0]).toMatchObject({
      id: 'p-1',
      dossierId: 'd-1',
      name: 'rib.pdf',
      ext: 'PDF',
      by: 'Aminata Diallo',
    });
  });

  it('should send the product as an operation id and the account with the AUTRE role', () => {
    const body = brouillonOf(dossierFromApi(api));
    expect(body).toEqual({
      typeDossierId: 'td-pret',
      operationId: 'op-habitat',
      priorite: 'HAUTE',
      tiersNom: 'Diallo',
      tiersPrenom: 'Awa',
      tiersNumero: '000123456789',
      montant: 5000000,
      donnees: { montantPret: '5000000', duree: '36' },
      note: 'Urgent',
      comptes: [{ role: 'AUTRE', numero: 'CPT-0012345' }],
    });
  });

  it('should rebuild a state with its receiver and the reception status of each dossier', () => {
    const etat: ApiEtat = {
      id: 'e-1',
      reference: 'ET-2026-0001',
      nature: 'INITIAL',
      typeEtatId: 'te-1',
      typeEtatNom: 'Accueil central',
      entiteEmettrice: { id: 'b-plateau', code: 'AG-014', nom: 'Agence Plateau' },
      entiteReceptrice: { id: 'b-accueil', code: 'EC-001', nom: 'Accueil central' },
      agentEmetteurId: 'u-1',
      agentEmetteur: 'Aminata Diallo',
      statut: 'RECU_PARTIELLEMENT',
      transmisLe: '2026-10-30T09:00:00Z',
      recuLe: '2026-10-30T10:00:00Z',
      nombreDossiers: 1,
      dossiers: [
        {
          dossierId: 'd-1',
          reference: 'DOS-00012',
          typeDossier: 'Demande de prêt',
          tiersNom: 'Diallo',
          tiersPrenom: 'Awa',
          tiersNumero: '000123456789',
          priorite: 'HAUTE',
          statutReception: 'NON_RECU',
          recuLe: null,
          dossier: { ...api, statut: 'TRANSMIS', entiteTraitementId: 'b-credits' },
          pieces: [],
        },
      ],
    };
    const front = etatFromApi(etat);
    expect(front).toMatchObject({
      id: 'e-1',
      ref: 'ET-2026-0001',
      agence: 'Agence Plateau',
      emetteur: 'Aminata Diallo',
      dest: 'Accueil central (EC-001)',
      recep: 'EC-001',
      status: 'Reçu partiellement',
      type: 'Demande de prêt',
    });
    expect(front.dossiers[0]).toMatchObject({
      status: 'Non reçu',
      entite: 'Service Crédits (ET-007)',
    });
    expect(front.dossiers[0].nonRec).toBeDefined();
  });
});
