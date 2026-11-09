import { RoleCompte } from '../../dossiers/domain/dossier-catalog';
import { ApiFormulaire, formatsOf } from '../../dossiers/domain/entities/referentiel.entity';

export type ChampKind = 'TEXTE' | 'NOMBRE' | 'DATE' | 'LISTE';

export const CHAMP_KINDS: readonly { id: ChampKind; label: string }[] = [
  { id: 'TEXTE', label: 'Texte' },
  { id: 'NOMBRE', label: 'Nombre' },
  { id: 'DATE', label: 'Date' },
  { id: 'LISTE', label: 'Liste de choix' },
];

export const UNITES: readonly { id: string; label: string }[] = [
  { id: '', label: 'Aucune' },
  { id: 'FCFA', label: 'FCFA' },
  { id: 'mois', label: 'mois' },
];

export const COMPTES_CHOIX: readonly { id: string; label: string; roles: RoleCompte[] }[] = [
  { id: 'AUTRE', label: 'Un numéro de compte', roles: ['AUTRE'] },
  { id: 'COMPTE_CHEQUE', label: 'Un compte chèque', roles: ['COMPTE_CHEQUE'] },
  {
    id: 'COMPTE_CHEQUE,COMPTE_PRODUIT',
    label: 'Un compte chèque et un compte produit',
    roles: ['COMPTE_CHEQUE', 'COMPTE_PRODUIT'],
  },
];

export const FORMATS_PIECE: readonly string[] = ['pdf', 'jpg', 'png', 'doc', 'docx'];

export const TAILLES_PIECE: readonly { ko: number; label: string }[] = [
  { ko: 512, label: '500 Ko' },
  { ko: 1024, label: '1 Mo' },
  { ko: 2048, label: '2 Mo' },
  { ko: 5120, label: '5 Mo' },
];

export interface PieceDraft {
  libelle: string;
  obligatoire: boolean;
  aJoindre: boolean;
  formats: string[];
  tailleMaxKo: number;
}

export interface ChampDraft {
  key: number;
  code: string | null;
  libelle: string;
  kind: ChampKind;
  obligatoire: boolean;
  unite: string;
  valeurs: string;
  enTete: boolean;
}

export interface FormulaireDraft {
  numeroClient: boolean;
  comptes: string;
  champs: ChampDraft[];
  pieces: PieceDraft[];
}

export interface FormulaireRequest {
  champs: {
    code: string | null;
    libelle: string;
    typeDonnee: ChampKind;
    obligatoire: boolean;
    unite: string | null;
    valeurs: string[];
    enTete: boolean;
  }[];
  pieces: {
    libelle: string;
    obligatoire: boolean;
    formats: string | null;
    tailleMaxKo: number | null;
  }[];
  numeroClientRequis: boolean;
  comptes: RoleCompte[];
}

export function newPiece(): PieceDraft {
  return { libelle: '', obligatoire: true, aJoindre: false, formats: ['pdf'], tailleMaxKo: 5120 };
}

let nextKey = 1;

export function newChamp(): ChampDraft {
  return {
    key: nextKey++,
    code: null,
    libelle: '',
    kind: 'TEXTE',
    obligatoire: false,
    unite: '',
    valeurs: '',
    enTete: false,
  };
}

export function draftFromApi(formulaire: ApiFormulaire): FormulaireDraft {
  const comptes = (formulaire.typeDossier.comptes ?? ['AUTRE']).join(',');
  return {
    numeroClient: formulaire.typeDossier.numeroClientRequis ?? true,
    comptes: COMPTES_CHOIX.some((choix) => choix.id === comptes) ? comptes : 'AUTRE',
    champs: formulaire.champs.map((champ) => ({
      key: nextKey++,
      code: champ.code,
      libelle: champ.libelle,
      kind: CHAMP_KINDS.some((kind) => kind.id === champ.typeDonnee)
        ? (champ.typeDonnee as ChampKind)
        : 'TEXTE',
      obligatoire: champ.obligatoire,
      unite: champ.unite ?? '',
      valeurs: champ.valeurs.map((valeur) => valeur.libelle).join('\n'),
      enTete: !!champ.enTete,
    })),
    pieces: formulaire.pieces.map((piece) => {
      const formats = formatsOf(piece);
      return {
        libelle: piece.libelle,
        obligatoire: piece.obligatoire,
        aJoindre: formats.length > 0,
        formats: formats.length ? formats : ['pdf'],
        tailleMaxKo: piece.tailleMaxKo ?? 5120,
      };
    }),
  };
}

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function requestOf(draft: FormulaireDraft): FormulaireRequest {
  return {
    champs: draft.champs.map((champ) => ({
      code: champ.code,
      libelle: champ.libelle.trim(),
      typeDonnee: champ.kind,
      obligatoire: champ.obligatoire,
      unite: champ.kind === 'NOMBRE' && champ.unite ? champ.unite : null,
      valeurs: champ.kind === 'LISTE' ? lines(champ.valeurs) : [],
      enTete: champ.enTete,
    })),
    pieces: draft.pieces
      .filter((piece) => piece.libelle.trim())
      .map((piece) => ({
        libelle: piece.libelle.trim(),
        obligatoire: piece.obligatoire,
        formats: piece.aJoindre
          ? FORMATS_PIECE.filter((f) => piece.formats.includes(f)).join(',')
          : null,
        tailleMaxKo: piece.aJoindre ? piece.tailleMaxKo : null,
      })),
    numeroClientRequis: draft.numeroClient,
    comptes: COMPTES_CHOIX.find((choix) => choix.id === draft.comptes)?.roles ?? ['AUTRE'],
  };
}

export function formulaireErrors(draft: FormulaireDraft): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  draft.champs.forEach((champ, index) => {
    const libelle = champ.libelle.trim();
    if (!libelle) {
      errors.push(`Champ n° ${index + 1} : le libellé est obligatoire.`);
      return;
    }
    if (seen.has(libelle.toLowerCase())) {
      errors.push(`Deux champs portent le libellé « ${libelle} ».`);
    }
    seen.add(libelle.toLowerCase());
    if (champ.kind === 'LISTE') {
      const valeurs = lines(champ.valeurs);
      if (!valeurs.length) {
        errors.push(`${libelle} : saisissez au moins une valeur, une par ligne.`);
      } else if (new Set(valeurs.map((v) => v.toLowerCase())).size < valeurs.length) {
        errors.push(`${libelle} : une valeur est en double.`);
      }
    }
  });
  const pieces = draft.pieces.map((piece) => piece.libelle.trim().toLowerCase()).filter(Boolean);
  if (new Set(pieces).size < pieces.length) {
    errors.push('Une pièce attendue est en double.');
  }
  draft.pieces.forEach((piece) => {
    if (piece.aJoindre && !piece.formats.length) {
      errors.push(`${piece.libelle.trim() || 'Pièce'} : cochez au moins un format.`);
    }
  });
  return errors;
}

export function sameFormulaire(a: FormulaireDraft, b: FormulaireDraft): boolean {
  return JSON.stringify(requestOf(a)) === JSON.stringify(requestOf(b));
}
