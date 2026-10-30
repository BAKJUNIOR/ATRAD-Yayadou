/**
 * Chemins de l'API, communs à tous les environnements (repris par chacun sous `environment.endpoints`).
 * Complétés domaine par domaine au fil du branchement ; un chemin à identifiant est une fonction.
 */
export const endpoints = {
  auth: {
    login: 'api/v1/auth/login',
  },
  moi: {
    base: 'api/v1/moi',
  },
  branding: {
    base: 'api/v1/branding',
  },
  entites: {
    base: 'api/v1/entites',
  },
  typesEtat: {
    base: 'api/v1/types-etat',
    modeSaisie: 'api/v1/types-etat/mode-saisie',
  },
  motifs: {
    base: 'api/v1/motifs',
  },
  brouillon: {
    base: 'api/v1/brouillon/dossiers',
    byId: (id: string) => `api/v1/brouillon/dossiers/${id}`,
  },
  pieces: {
    base: (dossierId: string) => `api/v1/dossiers/${dossierId}/pieces`,
    byId: (dossierId: string, pieceId: string) => `api/v1/dossiers/${dossierId}/pieces/${pieceId}`,
  },
  etats: {
    transmettre: 'api/v1/etats/transmettre',
    emis: 'api/v1/etats/emis',
    recus: 'api/v1/etats/recus',
    byId: (id: string) => `api/v1/etats/${id}`,
    reception: (id: string) => `api/v1/etats/${id}/reception`,
  },
  retours: {
    base: 'api/v1/retours',
    renvoi: 'api/v1/retours/renvoi',
  },
  suivi: {
    agence: 'api/v1/suivi/agence',
    agenceDossier: (id: string) => `api/v1/suivi/agence/dossiers/${id}`,
    traitement: 'api/v1/suivi/traitement',
    accueil: 'api/v1/suivi/accueil',
  },
  typesDossier: {
    base: 'api/v1/types-dossier',
    formulaire: (id: string) => `api/v1/types-dossier/${id}/formulaire`,
  },
} as const;
