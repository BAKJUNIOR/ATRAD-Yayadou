import { ApiFormulaire } from '../../dossiers/domain/entities/referentiel.entity';
import {
  draftFromApi,
  formulaireErrors,
  newChamp,
  newPiece,
  requestOf,
  sameFormulaire,
} from './formulaire';

const API: ApiFormulaire = {
  typeDossier: {
    numeroClientRequis: false,
    comptes: ['COMPTE_CHEQUE', 'COMPTE_PRODUIT'],
  } as ApiFormulaire['typeDossier'],
  champs: [
    {
      code: 'objet',
      libelle: 'Objet de la réclamation',
      typeDonnee: 'LISTE',
      obligatoire: true,
      unite: null,
      motifRegex: null,
      aide: null,
      valeurs: [
        { code: 'CARTE_BLOQUEE', libelle: 'Carte bloquée' },
        { code: 'AUTRE', libelle: 'Autre' },
      ],
    },
  ],
  pieces: [
    { libelle: 'Relevé de compte', obligatoire: true },
    { libelle: 'Capture Delta', obligatoire: true, formats: 'doc,docx', tailleMaxKo: 1024 },
  ],
  operations: [],
};

describe('formulaire des types de dossier', () => {
  it('reprend le formulaire de l’API et le renvoie tel quel', () => {
    const draft = draftFromApi(API);
    expect(draft.champs[0].valeurs).toBe('Carte bloquée\nAutre');
    expect(requestOf(draft)).toEqual({
      champs: [
        {
          code: 'objet',
          libelle: 'Objet de la réclamation',
          typeDonnee: 'LISTE',
          obligatoire: true,
          unite: null,
          valeurs: ['Carte bloquée', 'Autre'],
          enTete: false,
        },
      ],
      pieces: [
        { libelle: 'Relevé de compte', obligatoire: true, formats: null, tailleMaxKo: null },
        { libelle: 'Capture Delta', obligatoire: true, formats: 'doc,docx', tailleMaxKo: 1024 },
      ],
      numeroClientRequis: false,
      comptes: ['COMPTE_CHEQUE', 'COMPTE_PRODUIT'],
    });
    expect(sameFormulaire(draft, draftFromApi(API))).toBe(true);
  });

  it('signale un libellé vide, un libellé en double et une liste sans valeur', () => {
    const draft = draftFromApi(API);
    const vide = newChamp();
    const doublon = { ...newChamp(), libelle: 'objet de la réclamation' };
    const liste = { ...newChamp(), libelle: 'Canal', kind: 'LISTE' as const, valeurs: '  \n' };
    const errors = formulaireErrors({ ...draft, champs: [...draft.champs, vide, doublon, liste] });
    expect(errors).toEqual([
      'Champ n° 2 : le libellé est obligatoire.',
      'Deux champs portent le libellé « objet de la réclamation ».',
      'Canal : saisissez au moins une valeur, une par ligne.',
    ]);
  });

  it('ne garde une unité que pour un nombre', () => {
    const texte = { ...newChamp(), libelle: 'Référence', unite: 'FCFA' };
    const nombre = { ...newChamp(), libelle: 'Montant', kind: 'NOMBRE' as const, unite: 'FCFA' };
    const request = requestOf({
      numeroClient: true,
      comptes: 'AUTRE',
      champs: [texte, nombre],
      pieces: [newPiece(), { ...newPiece(), libelle: 'RIB' }],
    });
    expect(request.champs.map((champ) => champ.unite)).toEqual([null, 'FCFA']);
    expect(request.pieces.map((piece) => piece.libelle)).toEqual(['RIB']);
    expect(request.comptes).toEqual(['AUTRE']);
  });

  it('demande au moins un format pour une pièce à joindre à la saisie', () => {
    const draft = draftFromApi(API);
    const capture = { ...newPiece(), libelle: 'Scan', aJoindre: true, formats: [] };
    expect(formulaireErrors({ ...draft, pieces: [capture] })).toEqual([
      'Scan : cochez au moins un format.',
    ]);
  });
});
