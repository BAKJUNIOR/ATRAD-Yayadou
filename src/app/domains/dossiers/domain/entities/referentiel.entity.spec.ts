import { ApiParametrage, referentielFromApi } from './referentiel.entity';

const entite = (
  id: string,
  code: string,
  nom: string,
  capacites: Partial<Record<'e' | 'r' | 't', boolean>>,
) => ({
  id,
  code,
  nom,
  nature: 'Service',
  parentId: null,
  peutEmettre: !!capacites.e,
  peutReceptionner: !!capacites.r,
  peutTraiter: !!capacites.t,
  modeRepartition: 'AUTOMATIQUE' as const,
  actif: true,
});

const typeDossier = (id: string, nom: string, actif = true) => ({
  id,
  code: nom.toUpperCase(),
  nom,
  description: null,
  typeEtatId: 'te-1',
  entiteTraitementId: 'b-credits',
  circuit: 'STANDARD',
  delaiTraitementJours: null,
  actif,
  rattache: true,
});

const parametrage: ApiParametrage = {
  entites: [
    entite('b-plateau', 'AG-014', 'Agence Plateau', { e: true }),
    entite('b-accueil', 'EC-001', 'Accueil central', { r: true }),
    entite('b-credits', 'ET-007', 'Service Crédits', { t: true }),
  ],
  typesEtat: [
    {
      id: 'te-1',
      code: 'ACCUEIL',
      nom: 'Accueil central',
      entiteReceptriceId: 'b-accueil',
      emettriceIds: ['b-plateau'],
      actif: true,
    },
    {
      id: 'te-2',
      code: 'ANCIEN',
      nom: 'Ancien',
      entiteReceptriceId: 'b-accueil',
      emettriceIds: [],
      actif: false,
    },
  ],
  typesDossier: [
    typeDossier('td-pret', 'Demande de prêt'),
    typeDossier('td-ancien', 'Ancien type', false),
  ],
  modeSaisie: 'AUTO',
  motifsRetour: [{ id: 'm-1', parentId: null, libelle: 'Revenus insuffisants' }],
  circuits: [],
  formulaires: [
    {
      typeDossier: typeDossier('td-pret', 'Demande de prêt'),
      champs: [
        {
          code: 'montantPret',
          libelle: 'Montant du prêt',
          typeDonnee: 'NOMBRE',
          obligatoire: true,
          unite: 'FCFA',
          motifRegex: null,
          aide: null,
          valeurs: [],
        },
        {
          code: 'typePret',
          libelle: 'Type de prêt',
          typeDonnee: 'LISTE',
          obligatoire: false,
          unite: null,
          motifRegex: null,
          aide: 'Choisir',
          valeurs: [{ code: 'CONSO', libelle: 'Consommation' }],
        },
      ],
      pieces: [{ libelle: 'Bulletins de salaire', obligatoire: true }],
      operations: [{ id: 'op-habitat', code: 'PRET_HABITAT', libelle: 'Prêt habitat' }],
    },
  ],
};

describe('referentielFromApi', () => {
  const referentiel = referentielFromApi(parametrage);

  it('should designate entities by code and keep their API id', () => {
    expect(referentiel.entites[0]).toEqual({
      id: 'b-plateau',
      code: 'AG-014',
      nom: 'Agence Plateau',
      nature: 'Service',
      emet: true,
      recep: false,
      trait: false,
    });
  });

  it('should keep only active state types, with entity codes', () => {
    expect(referentiel.etatTypes).toEqual([
      { id: 'te-1', nom: 'Accueil central', recep: 'EC-001', emet: ['AG-014'] },
    ]);
  });

  it('should key active dossier types by name with their circuit and id', () => {
    expect(referentiel.dossierTypes).toEqual(['Demande de prêt']);
    expect(referentiel.circuits['Demande de prêt']).toEqual({
      et: 'te-1',
      trait: 'ET-007',
      check: false,
    });
    expect(referentiel.typeIds['Demande de prêt']).toBe('td-pret');
    expect(referentiel.saisieMode).toBe('auto');
  });

  it('should turn the form fields and expected documents into the input catalog', () => {
    expect(referentiel.typeFields['Demande de prêt']).toEqual([
      {
        key: 'montantPret',
        label: 'Montant du prêt',
        kind: 'number',
        options: undefined,
        placeholder: undefined,
        optional: false,
        zeroOk: true,
        unit: 'FCFA',
      },
      {
        key: 'typePret',
        label: 'Type de prêt',
        kind: 'select',
        options: ['Consommation'],
        placeholder: 'Choisir',
        optional: true,
        zeroOk: undefined,
        unit: undefined,
      },
    ]);
    expect(referentiel.typePieces['Demande de prêt']).toEqual(['Bulletins de salaire']);
    expect(referentiel.typeOperations['Demande de prêt']).toEqual([
      { id: 'op-habitat', label: 'Prêt habitat' },
    ]);
  });
});
