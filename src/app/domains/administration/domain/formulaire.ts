import { ApiFormulaire } from '../../dossiers/domain/entities/referentiel.entity';

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

export interface ChampDraft {
  key: number;
  code: string | null;
  libelle: string;
  kind: ChampKind;
  obligatoire: boolean;
  unite: string;
  valeurs: string;
}

export interface FormulaireDraft {
  champs: ChampDraft[];
  pieces: string[];
}

export interface FormulaireRequest {
  champs: {
    code: string | null;
    libelle: string;
    typeDonnee: ChampKind;
    obligatoire: boolean;
    unite: string | null;
    valeurs: string[];
  }[];
  pieces: string[];
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
  };
}

export function draftFromApi(formulaire: ApiFormulaire): FormulaireDraft {
  return {
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
    })),
    pieces: formulaire.pieces.map((piece) => piece.libelle),
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
    })),
    pieces: draft.pieces.map((piece) => piece.trim()).filter(Boolean),
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
  const pieces = draft.pieces.map((piece) => piece.trim().toLowerCase()).filter(Boolean);
  if (new Set(pieces).size < pieces.length) {
    errors.push('Une pièce attendue est en double.');
  }
  return errors;
}

export function sameFormulaire(a: FormulaireDraft, b: FormulaireDraft): boolean {
  return JSON.stringify(requestOf(a)) === JSON.stringify(requestOf(b));
}
