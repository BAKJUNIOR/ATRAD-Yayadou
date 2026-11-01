/** Entité de rattachement, sous la forme courte renvoyée avec un utilisateur. */
export interface EntiteResume {
  id: string;
  code: string;
  nom: string;
}

/** Utilisateur tel que renvoyé par l'API (`moi.base`, administration des utilisateurs). */
export interface Utilisateur {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  actif: boolean;
  derniereConnexion: string | null;
  creeLe: string;
  /** Codes des profils : AGENCE, ACCUEIL, TRAITEMENT, MANAGER, ADMIN. */
  profils: string[];
  entite: EntiteResume | null;
  fonction: string | null;
}
