import type { TypeField } from './dossier-catalog';
import { INTERNE_DATASET } from './datasets.interne';

/** Jeux de données de démonstration, choisis à la réinitialisation. */
export type DatasetId = 'interne' | 'neutre' | 'entreprise';

export function isDatasetId(value: unknown): value is DatasetId {
  return value === 'interne' || value === 'neutre' || value === 'entreprise';
}

/** Capacités d'une entité : émettre des états, les réceptionner, traiter des dossiers. */
export type EntityCapability = 'emet' | 'recep' | 'trait';

export interface Entite {
  /** Code au format `AA-000`, identifiant stable de l'entité. */
  code: string;
  nom: string;
  nature: string;
  emet: boolean;
  recep: boolean;
  trait: boolean;
}

/** Type d'état de transmission : une entité réceptrice et les entités autorisées à émettre. */
export interface EtatType {
  id: string;
  nom: string;
  /** Code de l'entité réceptrice. */
  recep: string;
  /** Codes des entités émettrices autorisées. */
  emet: string[];
}

/** Libellés et règles du formulaire de saisie d'un dossier, propres au jeu de données. */
export interface DossierFormLabels {
  type: string;
  produit: string;
  client: string;
  clientPlaceholder: string;
  /** Saisie du n° client : 12 chiffres, numéro + clé, ou objet libre. */
  clientRule: 'digits12' | 'numeroCle' | 'objet';
  clientMax: number;
  prenom: string;
  nom: string;
  compte: string;
  comptePlaceholder: string;
  showProduit: boolean;
  showPrenom: boolean;
  showCompte: boolean;
  showPrio: boolean;
  /** Prénom, nom et compte obligatoires. */
  identityRequired: boolean;
}

/** Réglages par défaut de la répartition interne, par code d'entité. */
export interface DefaultTeams {
  modes: Record<string, 'auto' | 'pool' | 'disp'>;
  teams: Record<string, string[]>;
  dispatchers: Record<string, string[]>;
  searchers: Record<string, string[]>;
}

export interface Dataset {
  id: DatasetId;
  label: string;
  /** Explication affichée dans le dialogue de réinitialisation. */
  description: string;
  types: string[];
  produits: string[];
  typeFields: Record<string, readonly TypeField[]>;
  /** Champs d'un type de dossier ajouté par l'administrateur. */
  addedTypeFields: readonly TypeField[];
  /** Champ dont la valeur devient le montant du dossier. */
  montantField: Record<string, string>;
  pieces: Record<string, readonly string[]>;
  form: DossierFormLabels;
  entites: Entite[];
  /** Types d'état et types de dossier qui leur sont rattachés par défaut. */
  etatTypes: (EtatType & { dossiers: string[] })[];
  /** Entité de traitement par défaut de chaque type de dossier (code). */
  mapping: Record<string, string>;
  teams: DefaultTeams;
  /** Entités de rattachement des comptes de démonstration. */
  accounts: { agence: string; accueil: string; traitement: string };
}

// ---------------------------------------------------------------- Jeu neutre

const NEUTRE_TYPES = [
  'Ouverture de compte',
  'Demande de prêt',
  'Réclamation',
  'Mise à jour KYC',
  'Clôture de compte',
];

const NEUTRE: Dataset = {
  id: 'neutre',
  label: 'Jeu de démonstration neutre',
  description: 'Agences et services fictifs, 5 types de dossier génériques.',
  types: NEUTRE_TYPES,
  produits: [
    'Compte courant',
    'Compte épargne',
    'Prêt habitat',
    'Prêt conso',
    'Prêt auto',
    'Carte Visa Classic',
    'Assurance vie',
  ],
  typeFields: {
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
      {
        key: 'duree',
        label: 'Durée souhaitée',
        kind: 'number',
        unit: 'mois',
        placeholder: 'Ex. 36',
      },
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
  },
  addedTypeFields: [],
  montantField: { 'Demande de prêt': 'montantPret', 'Ouverture de compte': 'depot' },
  pieces: {
    'Ouverture de compte': [
      "Pièce d'identité",
      'Justificatif de domicile',
      "Photo d'identité",
      "Formulaire d'ouverture signé",
    ],
    'Demande de prêt': [
      "Pièce d'identité",
      'Bulletins de salaire (3 derniers mois)',
      'Relevés bancaires',
      'Attestation de travail',
    ],
    Réclamation: [
      'Formulaire de réclamation signé',
      "Justificatif de l'opération",
      'Relevé de compte',
    ],
    'Mise à jour KYC': [
      "Pièce d'identité en cours de validité",
      'Justificatif de domicile récent',
      'Fiche KYC signée',
    ],
    'Clôture de compte': [
      'Lettre de demande de clôture signée',
      "Pièce d'identité",
      'RIB du compte de destination',
    ],
  },
  form: {
    type: 'Type de dossier',
    produit: 'Type de produit',
    client: 'Numéro client',
    clientPlaceholder: '12 chiffres, ex. 000123456789',
    clientRule: 'digits12',
    clientMax: 12,
    prenom: 'Prénom du client',
    nom: 'Nom du client',
    compte: 'N° de compte',
    comptePlaceholder: 'CPT-0000000',
    showProduit: true,
    showPrenom: true,
    showCompte: true,
    showPrio: true,
    identityRequired: false,
  },
  entites: [
    {
      code: 'AG-014',
      nom: 'Agence Plateau',
      nature: 'Agence',
      emet: true,
      recep: false,
      trait: false,
    },
    {
      code: 'AG-021',
      nom: 'Agence Cocody',
      nature: 'Agence',
      emet: true,
      recep: false,
      trait: false,
    },
    {
      code: 'AG-033',
      nom: 'Agence Yopougon',
      nature: 'Agence',
      emet: true,
      recep: false,
      trait: false,
    },
    {
      code: 'EC-001',
      nom: 'Accueil central',
      nature: 'Service',
      emet: false,
      recep: true,
      trait: false,
    },
    {
      code: 'ET-007',
      nom: 'Service Crédits',
      nature: 'Service',
      emet: false,
      recep: false,
      trait: true,
    },
    {
      code: 'ET-031',
      nom: 'Service Conformité',
      nature: 'Service',
      emet: false,
      recep: false,
      trait: true,
    },
    {
      code: 'ET-020',
      nom: 'Service Réclamations',
      nature: 'Service',
      emet: false,
      recep: true,
      trait: true,
    },
    {
      code: 'ET-012',
      nom: 'Entité Monétique',
      nature: 'Service',
      emet: false,
      recep: false,
      trait: true,
    },
  ],
  etatTypes: [
    {
      id: 'TE-01',
      nom: 'Accueil central',
      recep: 'EC-001',
      emet: ['AG-014', 'AG-021', 'AG-033'],
      dossiers: ['Ouverture de compte', 'Demande de prêt', 'Mise à jour KYC', 'Clôture de compte'],
    },
    {
      id: 'TE-02',
      nom: 'Réclamations',
      recep: 'ET-020',
      emet: ['AG-014', 'AG-021', 'AG-033'],
      dossiers: ['Réclamation'],
    },
  ],
  mapping: {
    'Ouverture de compte': 'ET-007',
    'Demande de prêt': 'ET-007',
    Réclamation: 'ET-020',
    'Mise à jour KYC': 'ET-031',
    'Clôture de compte': 'ET-031',
  },
  teams: {
    modes: { 'ET-007': 'disp' },
    teams: {
      'ET-007': ['Fatou Bamba', 'Éric Tanoh', 'Clarisse Yao'],
      'ET-012': ['Éric Tanoh'],
      'ET-020': ['Fatou Bamba', 'Ismaël Ouédraogo'],
      'ET-031': ['Clarisse Yao', 'Ismaël Ouédraogo'],
    },
    dispatchers: { 'ET-007': ['Éric Tanoh'] },
    searchers: { 'ET-007': ['Fatou Bamba', 'Éric Tanoh'], 'ET-031': ['Clarisse Yao'] },
  },
  accounts: {
    agence: 'Agence Plateau (AG-014)',
    accueil: 'Accueil central (EC-001)',
    traitement: 'Service Crédits (ET-007)',
  },
};

// ----------------------------------------------------------- Jeu entreprise

const ENT_TYPES = [
  "Demande d'application",
  "Demande d'accès",
  'Facture à valider',
  'Note de frais',
  'Contrat à relire',
  'Congé exceptionnel',
];

const ENT_FIELDS: readonly TypeField[] = [
  { key: 'montant', label: 'Montant', kind: 'number', placeholder: 'Ex. 250000', optional: true },
  { key: 'echeance', label: "Date d'échéance", kind: 'date', optional: true },
];

const ENT_EMETTRICES = ['DE-001', 'DC-001'];

const ENTREPRISE: Dataset = {
  id: 'entreprise',
  label: 'Entreprise (services)',
  description:
    'Directions et services fictifs, 6 types de dossier (informatique, finance, juridique, RH). Aucune donnée réelle.',
  types: ENT_TYPES,
  produits: ['—'],
  typeFields: Object.fromEntries(ENT_TYPES.map((type) => [type, ENT_FIELDS])),
  addedTypeFields: ENT_FIELDS,
  montantField: {},
  pieces: {
    "Demande d'application": ['Expression de besoin', 'Validation du responsable'],
    "Demande d'accès": ["Formulaire de demande d'accès", 'Validation du responsable'],
    'Facture à valider': ['Facture originale', 'Bon de commande', 'Bon de livraison'],
    'Note de frais': ['Justificatifs de dépenses', 'Ordre de mission'],
    'Contrat à relire': ['Projet de contrat', 'Annexes'],
    'Congé exceptionnel': ['Demande signée', "Justificatif de l'événement"],
  },
  form: {
    type: 'Type de dossier',
    produit: 'Type de produit',
    client: 'Objet',
    clientPlaceholder: 'Objet de la demande',
    clientRule: 'objet',
    clientMax: 120,
    prenom: 'Prénom du client',
    nom: 'Tiers concerné',
    compte: 'N° de compte',
    comptePlaceholder: 'CPT-0000000',
    showProduit: false,
    showPrenom: false,
    showCompte: false,
    showPrio: true,
    identityRequired: false,
  },
  entites: [
    {
      code: 'DE-001',
      nom: 'Direction Exécutive',
      nature: 'Direction',
      emet: true,
      recep: false,
      trait: false,
    },
    {
      code: 'DC-001',
      nom: 'Département Commercial',
      nature: 'Département',
      emet: true,
      recep: false,
      trait: false,
    },
    {
      code: 'SI-001',
      nom: 'Service Informatique',
      nature: 'Service',
      emet: false,
      recep: true,
      trait: true,
    },
    {
      code: 'SF-001',
      nom: 'Service Finance',
      nature: 'Service',
      emet: false,
      recep: true,
      trait: true,
    },
    {
      code: 'SG-001',
      nom: 'Secrétariat Général',
      nature: 'Service',
      emet: false,
      recep: true,
      trait: false,
    },
    {
      code: 'SJ-001',
      nom: 'Service Juridique',
      nature: 'Service',
      emet: false,
      recep: false,
      trait: true,
    },
    {
      code: 'RH-001',
      nom: 'Service RH',
      nature: 'Service',
      emet: false,
      recep: false,
      trait: true,
    },
  ],
  etatTypes: [
    {
      id: 'TE-01',
      nom: 'Informatique',
      recep: 'SI-001',
      emet: ENT_EMETTRICES,
      dossiers: ["Demande d'application", "Demande d'accès"],
    },
    {
      id: 'TE-02',
      nom: 'Finance',
      recep: 'SF-001',
      emet: ENT_EMETTRICES,
      dossiers: ['Facture à valider', 'Note de frais'],
    },
    {
      id: 'TE-03',
      nom: 'Secrétariat',
      recep: 'SG-001',
      emet: ENT_EMETTRICES,
      dossiers: ['Contrat à relire', 'Congé exceptionnel'],
    },
  ],
  mapping: {
    "Demande d'application": 'SI-001',
    "Demande d'accès": 'SI-001',
    'Facture à valider': 'SF-001',
    'Note de frais': 'SF-001',
    'Contrat à relire': 'SJ-001',
    'Congé exceptionnel': 'RH-001',
  },
  teams: {
    modes: {},
    teams: {
      'SI-001': ['Fatou Bamba'],
      'SF-001': ['Éric Tanoh'],
      'SJ-001': ['Clarisse Yao'],
      'RH-001': ['Ismaël Ouédraogo'],
    },
    dispatchers: {},
    searchers: {},
  },
  accounts: {
    agence: 'Direction Exécutive (DE-001)',
    accueil: 'Secrétariat Général (SG-001)',
    traitement: 'Service Informatique (SI-001)',
  },
};

/** Jeux disponibles dans ce build : le jeu interne est retiré de la démo publique. */
export const DATASETS: Partial<Record<DatasetId, Dataset>> = {
  neutre: NEUTRE,
  ...(INTERNE_DATASET ? { interne: INTERNE_DATASET } : {}),
  entreprise: ENTREPRISE,
};

export function datasetOf(id: DatasetId): Dataset {
  return DATASETS[id] ?? NEUTRE;
}

export const DATASET_IDS: readonly DatasetId[] = (
  ['entreprise', 'interne', 'neutre'] as const
).filter((id) => !!DATASETS[id]);

/** Clé du jeu choisi à la réinitialisation ; il s'applique au rechargement de l'application. */
export const DATASET_KEY = 'atrad_dataset_v1';

/**
 * Jeu enregistré ; à défaut, le jeu neutre si des données de démo existent déjà (elles ont été
 * créées avec lui), sinon le jeu interne quand ce build le contient.
 */
export function storedDatasetId(): DatasetId {
  const fallback: DatasetId = DATASETS.interne ? 'interne' : 'neutre';
  try {
    const value = localStorage.getItem(DATASET_KEY);
    if (isDatasetId(value) && DATASETS[value]) {
      return value;
    }
    return localStorage.getItem('atrad_live_data_v1') ? 'neutre' : fallback;
  } catch {
    return fallback;
  }
}
