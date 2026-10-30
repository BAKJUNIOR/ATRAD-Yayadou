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
    coordonnees: 'api/v1/moi/coordonnees',
    motDePasse: 'api/v1/moi/mot-de-passe',
  },
  branding: {
    base: 'api/v1/branding',
    logo: (type: string) => `api/v1/branding/logos/${type}`,
  },
  entites: {
    base: 'api/v1/entites',
    byId: (id: string) => `api/v1/entites/${id}`,
  },
  typesEtat: {
    base: 'api/v1/types-etat',
    byId: (id: string) => `api/v1/types-etat/${id}`,
    modeSaisie: 'api/v1/types-etat/mode-saisie',
  },
  motifs: {
    base: 'api/v1/motifs',
  },
  circuits: {
    byCode: (code: string) => `api/v1/circuits/${code}`,
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
  traitement: {
    mesDossiers: 'api/v1/traitement/mes-dossiers',
    pool: 'api/v1/traitement/pool',
    bac: 'api/v1/traitement/bac',
    recherche: 'api/v1/traitement/recherche',
    dossier: (id: string) => `api/v1/traitement/dossiers/${id}`,
    prendre: (id: string) => `api/v1/traitement/dossiers/${id}/prendre`,
    affecter: (id: string) => `api/v1/traitement/dossiers/${id}/affecter`,
    actions: (id: string) => `api/v1/traitement/dossiers/${id}/actions`,
    demandeDocuments: (id: string) => `api/v1/traitement/dossiers/${id}/demande-documents`,
    retour: (id: string) => `api/v1/traitement/dossiers/${id}/retour`,
  },
  repartition: {
    byEntite: (entiteId: string) => `api/v1/entites/${entiteId}/repartition`,
  },
  utilisateurs: {
    base: 'api/v1/utilisateurs',
    byId: (id: string) => `api/v1/utilisateurs/${id}`,
    profils: (id: string) => `api/v1/utilisateurs/${id}/profils`,
    statut: (id: string) => `api/v1/utilisateurs/${id}/statut`,
    affectation: (id: string) => `api/v1/utilisateurs/${id}/affectation`,
  },
  referentielOrganisation: {
    profils: 'api/v1/profils',
    fonctions: 'api/v1/fonctions',
  },
  pilotage: {
    tableauDeBord: 'api/v1/pilotage/tableau-de-bord',
    delais: 'api/v1/pilotage/delais',
    agences: 'api/v1/pilotage/agences',
  },
  notifications: {
    base: 'api/v1/notifications',
    nonLues: 'api/v1/notifications/non-lues',
    lue: (id: string) => `api/v1/notifications/${id}/lue`,
    toutesLues: 'api/v1/notifications/lues',
  },
  /** Point de connexion WebSocket (STOMP) et files personnelles : notifications, données modifiées. */
  tempsReel: {
    socket: 'ws/websocket',
    notifications: '/user/queue/notifications',
    donnees: '/user/queue/donnees',
  },
  suivi: {
    agence: 'api/v1/suivi/agence',
    agenceDossier: (id: string) => `api/v1/suivi/agence/dossiers/${id}`,
    traitement: 'api/v1/suivi/traitement',
    accueil: 'api/v1/suivi/accueil',
  },
  typesDossier: {
    base: 'api/v1/types-dossier',
    byId: (id: string) => `api/v1/types-dossier/${id}`,
    circuit: (id: string) => `api/v1/types-dossier/${id}/circuit`,
    formulaire: (id: string) => `api/v1/types-dossier/${id}/formulaire`,
  },
} as const;
