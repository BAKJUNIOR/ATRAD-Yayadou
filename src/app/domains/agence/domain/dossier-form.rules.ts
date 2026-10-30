import {
  DOSSIER_TYPES,
  DossierType,
  PRIORITES,
  Priorite,
  Produit,
  TypeField,
  dataset,
  displayValue,
  fieldsOf,
  formatNumber,
  montantFieldOf,
  produitsOf,
} from '../../dossiers/domain/dossier-catalog';
import { Dossier, DossierData, PieceJointe } from '../../dossiers/domain/entities/dossier.entity';

/** Valeurs saisies dans le formulaire de dossier, avant contrôle. */
export interface DossierFormValue {
  type: DossierType;
  client: string;
  prenom: string;
  nom: string;
  compte: string;
  produit: Produit;
  prio: Priorite;
  note: string;
  /** Valeurs des champs propres au type, par clé de champ. */
  extra: Record<string, string>;
}

export type BaseFieldKey = 'client' | 'prenom' | 'nom' | 'compte';

export const BASE_FIELD_KEYS: readonly BaseFieldKey[] = ['client', 'prenom', 'nom', 'compte'];

export const CLIENT_NUMBER_LENGTH = 12;

/** Le n° client n'accepte que des chiffres (jeu neutre) : la saisie est filtrée. */
export function filterClientInput(raw: string): string {
  const { clientRule, clientMax } = dataset().form;
  return clientRule === 'digits12'
    ? raw.replace(/\D/g, '').slice(0, clientMax)
    : raw.slice(0, clientMax);
}

export function emptyDossierForm(type: DossierType = DOSSIER_TYPES[0] ?? ''): DossierFormValue {
  return {
    type,
    client: '',
    prenom: '',
    nom: '',
    compte: '',
    produit: produitsOf(type)[0] ?? '',
    prio: PRIORITES[0],
    note: '',
    extra: {},
  };
}

/** Message d'erreur d'un champ, ou chaîne vide s'il est valide. */
export function fieldError(key: string, raw: string, type: DossierType, todayIso: string): string {
  const value = (raw ?? '').trim();
  const form = dataset().form;
  if (form.clientRule === 'objet') {
    if (key === 'client') {
      return !value
        ? 'Champ obligatoire.'
        : value.length > form.clientMax
          ? `${form.clientMax} caractères maximum.`
          : '';
    }
    if (key === 'nom') {
      return value ? '' : 'Champ obligatoire.';
    }
    if (key === 'prenom' || key === 'compte') {
      return '';
    }
  }
  if (form.clientRule === 'numeroCle' && (key === 'client' || key === 'compte')) {
    if (!value) {
      return 'Champ obligatoire.';
    }
    return /^[0-9A-Za-z][0-9A-Za-z -]{3,29}$/.test(value)
      ? ''
      : 'Numéro + clé : chiffres, lettres, espaces ou tirets (4 à 30 caractères).';
  }
  if (form.identityRequired && (key === 'prenom' || key === 'nom') && !value) {
    return 'Champ obligatoire.';
  }
  if (key === 'client') {
    if (!value) {
      return 'Champ obligatoire.';
    }
    return /^\d{12}$/.test(value)
      ? ''
      : `Exactement ${CLIENT_NUMBER_LENGTH} chiffres (${value.length}/${CLIENT_NUMBER_LENGTH}).`;
  }
  if (key === 'prenom' || key === 'nom') {
    return value && !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(value)
      ? 'Lettres, espaces, tirets et apostrophes uniquement.'
      : '';
  }
  if (key === 'compte') {
    return value && !/^[A-Za-z0-9-]{4,20}$/.test(value)
      ? 'Lettres, chiffres et tirets uniquement (4 à 20 caractères), ex. CPT-0000000.'
      : '';
  }

  const field = fieldsOf(type).find((candidate) => candidate.key === key);
  if (!field) {
    return '';
  }
  if (!value) {
    return field.optional ? '' : 'Champ obligatoire.';
  }
  if (field.kind === 'number') {
    const amount = Number(value);
    if (Number.isNaN(amount) || amount < 0 || (amount === 0 && !field.zeroOk)) {
      return 'Nombre positif attendu.';
    }
  }
  if (field.kind === 'date' && type === 'Mise à jour KYC' && value < todayIso) {
    return 'Pièce déjà expirée : saisissez une date future.';
  }
  return '';
}

export function allFieldErrors(value: DossierFormValue, todayIso: string): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of BASE_FIELD_KEYS) {
    errors[key] = fieldError(key, value[key], value.type, todayIso);
  }
  for (const field of fieldsOf(value.type)) {
    errors[field.key] = fieldError(field.key, value.extra[field.key] ?? '', value.type, todayIso);
  }
  return errors;
}

export type BuildResult =
  { ok: true; data: DossierData } | { ok: false; error: string; errors: Record<string, string> };

/** Contrôle le formulaire et construit le dossier (mêmes règles en création et en modification). */
export function buildDossierData(
  value: DossierFormValue,
  pieces: readonly PieceJointe[],
  todayIso: string,
): BuildResult {
  const errors = allFieldErrors(value, todayIso);
  const invalidCount = Object.values(errors).filter(Boolean).length;
  if (invalidCount) {
    return {
      ok: false,
      errors,
      error: `${invalidCount} champ(s) à corriger (en rouge) avant de continuer.`,
    };
  }

  const fields = fieldsOf(value.type);
  const rawOf = (field: TypeField): string => (value.extra[field.key] ?? '').trim();
  const filled = fields.filter((field) => rawOf(field));
  const montantField = fields.find((field) => field.key === montantFieldOf(value.type));
  const prenom = value.prenom.trim();
  const nom = value.nom.trim();

  return {
    ok: true,
    data: {
      num: value.client.trim().toUpperCase(),
      prenom,
      nom,
      compte: value.compte.trim().toUpperCase(),
      client: [prenom, nom].filter(Boolean).join(' ') || 'Client non renseigné',
      type: value.type,
      produit: value.produit,
      prio: value.prio,
      note: value.note.trim(),
      pieces: [...pieces],
      extra: filled.map((field) => ({
        label: field.label,
        value: displayValue(field, rawOf(field)),
      })),
      xraw: Object.fromEntries(filled.map((field) => [field.key, rawOf(field)])),
      montant: montantField ? `${formatNumber(rawOf(montantField))} FCFA` : undefined,
    },
  };
}

/** Recharge un dossier dans le formulaire pour le modifier. */
export function formValueOf(dossier: Dossier): DossierFormValue {
  return {
    type: dossier.type,
    client: dossier.num,
    prenom: dossier.prenom,
    nom: dossier.nom,
    compte: dossier.compte,
    produit: dossier.produit,
    prio: dossier.prio,
    note: dossier.note,
    extra: { ...dossier.xraw },
  };
}

/** Libellés des informations modifiées entre deux versions d'un dossier. */
export function changedLabels(previous: DossierData, next: DossierData): string[] {
  const changes: string[] = [];
  const compare = (label: string, before: string, after: string): void => {
    if (before !== after) {
      changes.push(label);
    }
  };
  compare('Type de dossier', previous.type, next.type);
  compare('N° client', previous.num, next.num);
  compare('Prénom', previous.prenom, next.prenom);
  compare('Nom', previous.nom, next.nom);
  compare('N° de compte', previous.compte, next.compte);
  compare('Produit', previous.produit, next.produit);
  compare('Priorité', previous.prio, next.prio);
  compare('Observation', previous.note, next.note);

  const pieceIds = (pieces: readonly PieceJointe[]): string => pieces.map((p) => p.id).join(',');
  compare('Pièces jointes', pieceIds(previous.pieces), pieceIds(next.pieces));

  const before = new Map(previous.extra.map((extra) => [extra.label, extra.value]));
  const after = new Map(next.extra.map((extra) => [extra.label, extra.value]));
  for (const label of new Set([...before.keys(), ...after.keys()])) {
    compare(label, before.get(label) ?? '', after.get(label) ?? '');
  }
  return changes;
}

/** Empreinte du formulaire, pour savoir si une modification en cours a réellement changé. */
export function formSnapshot(value: DossierFormValue, pieces: readonly PieceJointe[]): string {
  const extra = Object.fromEntries(
    fieldsOf(value.type).map((field) => [field.key, value.extra[field.key] ?? '']),
  );
  return JSON.stringify([{ ...value, extra }, pieces.map((piece) => piece.id)]);
}

/** Une saisie a commencé (hors listes déroulantes, qui ont toujours une valeur). */
export function hasTypedContent(value: DossierFormValue): boolean {
  return [
    value.client,
    value.prenom,
    value.nom,
    value.compte,
    value.note,
    ...Object.values(value.extra),
  ].some((text) => text.trim());
}
