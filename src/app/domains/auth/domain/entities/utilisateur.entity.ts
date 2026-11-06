export interface EntiteResume {
  id: string;
  code: string;
  nom: string;
}

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
  profils: string[];
  entite: EntiteResume | null;
  fonction: string | null;
}
