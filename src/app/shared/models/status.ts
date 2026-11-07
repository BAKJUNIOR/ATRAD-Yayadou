export const STATUS_KEYS = {
  Temporaire: 'temporaire',
  Transmis: 'transmis',
  Reçu: 'recu',
  'Reçu partiellement': 'recupart',
  'Non reçu': 'nonrecu',
  'En cours': 'encours',
  Validé: 'valide',
  Projeté: 'projete',
  Traité: 'traite',
  Rejeté: 'rejete',
  'Dossier retourné': 'retourne',
  'En attente de document(s) complémentaire(s)': 'complement',
  Clôturé: 'cloture',
  'Retour en cours': 'retourencours',
  'Retourné en agence': 'cloture',
  'En retard': 'retard',
} as const;

export type Status = keyof typeof STATUS_KEYS;
