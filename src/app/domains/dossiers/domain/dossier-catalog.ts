export const DOSSIER_TYPES = [
  'Ouverture de compte',
  'Demande de prêt',
  'Réclamation',
  'Mise à jour KYC',
  'Clôture de compte',
] as const;

export type DossierType = (typeof DOSSIER_TYPES)[number];

export const PRODUITS = [
  'Compte courant',
  'Compte épargne',
  'Prêt habitat',
  'Prêt conso',
  'Prêt auto',
  'Carte Visa Classic',
  'Assurance vie',
] as const;

export type Produit = (typeof PRODUITS)[number];

export const PRIORITES = ['Normale', 'Haute', 'Urgente'] as const;

export type Priorite = (typeof PRIORITES)[number];

/** Destinataire unique des états émis par les agences. */
export const ACCUEIL_CENTRAL = 'Accueil central (EC-001)';

export type TypeFieldKind = 'select' | 'number' | 'text' | 'date';

/** Champ propre à un type de dossier, ajouté au formulaire de saisie. */
export interface TypeField {
  key: string;
  label: string;
  kind: TypeFieldKind;
  options?: readonly string[];
  placeholder?: string;
  optional?: boolean;
  /** Un montant nul est accepté (ex. apport personnel). */
  zeroOk?: boolean;
  unit?: 'FCFA' | 'mois';
}

export const TYPE_FIELDS: Record<DossierType, readonly TypeField[]> = {
  'Ouverture de compte': [
    {
      key: 'typeCompte',
      label: 'Type de compte souhaité',
      kind: 'select',
      options: ['Courant', 'Épargne'],
    },
    {
      key: 'depot',
      label: 'Montant du dépôt initial',
      kind: 'number',
      unit: 'FCFA',
      placeholder: 'Ex. 50000',
    },
  ],
  'Demande de prêt': [
    {
      key: 'montantPret',
      label: 'Montant demandé',
      kind: 'number',
      unit: 'FCFA',
      placeholder: 'Ex. 5000000',
    },
    { key: 'duree', label: 'Durée souhaitée', kind: 'number', unit: 'mois', placeholder: 'Ex. 36' },
    {
      key: 'apport',
      label: 'Apport personnel',
      kind: 'number',
      unit: 'FCFA',
      placeholder: 'Ex. 500000',
      zeroOk: true,
    },
  ],
  Réclamation: [
    {
      key: 'objet',
      label: 'Objet de la réclamation',
      kind: 'select',
      options: ['Erreur de prélèvement', 'Carte bloquée', 'Frais contestés', 'Autre'],
    },
    {
      key: 'refOp',
      label: "Référence de l'opération concernée",
      kind: 'text',
      placeholder: 'Ex. OP-2026-000123',
      optional: true,
    },
  ],
  'Mise à jour KYC': [
    {
      key: 'piece',
      label: "Type de pièce d'identité",
      kind: 'select',
      options: ['CNI', 'Passeport', "Attestation d'identité"],
    },
    { key: 'expiration', label: "Date d'expiration de la pièce", kind: 'date' },
  ],
  'Clôture de compte': [
    {
      key: 'motifCloture',
      label: 'Motif de la clôture',
      kind: 'text',
      placeholder: "Ex. Déménagement à l'étranger",
    },
    {
      key: 'compteDest',
      label: 'Compte de destination du solde',
      kind: 'text',
      placeholder: 'Ex. CPT-0000000 ou IBAN',
    },
  ],
};

/** Champ dont la valeur devient le montant du dossier, pour les types qui en ont un. */
export const MONTANT_FIELD: Partial<Record<DossierType, string>> = {
  'Demande de prêt': 'montantPret',
  'Ouverture de compte': 'depot',
};

/** `1250000` → `1 250 000` */
export function formatNumber(value: string | number): string {
  return String(Math.round(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
