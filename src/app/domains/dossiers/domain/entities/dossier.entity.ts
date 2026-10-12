import { Status } from '../../../../shared/models/status';
import { TimelineTone } from '../../../../shared/ui/timeline/timeline.component';
import { DossierType, Priorite, Produit } from '../dossier-catalog';

export interface PieceJointe {
  id: string;
  name: string;
  size: number;
  mime: string;
  /** Extension en majuscules, affichée en pastille (PDF, JPG, ...). */
  ext: string;
  at: string;
  by: string;
}

/** Information propre au type de dossier, déjà mise en forme pour l'affichage. */
export interface DossierExtra {
  label: string;
  value: string;
}

export interface DossierLog {
  at: string;
  who: string;
  label: string;
  tone: TimelineTone;
  /** Événement antérieur à la transmission (modification en agence). */
  pre?: boolean;
}

/** Contenu saisi par l'agence. */
export interface DossierData {
  /** Numéro client, 12 chiffres. */
  num: string;
  prenom: string;
  nom: string;
  compte: string;
  /** Nom complet affiché dans les listes. */
  client: string;
  type: DossierType;
  produit: Produit;
  prio: Priorite;
  note: string;
  pieces: PieceJointe[];
  extra: DossierExtra[];
  /** Valeurs brutes des champs spécifiques, pour rouvrir le formulaire à l'identique. */
  xraw: Record<string, string>;
  montant?: string;
}

/** Dossier d'un état en cours de constitution (statut Temporaire). */
export interface Dossier extends DossierData {
  id: number;
  ref: string;
  createdAt: string;
  log: DossierLog[];
}

/** Pointage d'un dossier par l'Accueil. */
export interface ReceptionMark {
  at: string;
  by: string;
}

/** Dossier d'un état transmis. */
export interface EtatDossier extends Dossier {
  status: Status;
  transmisAt: string;
  rec?: ReceptionMark;
  nonRec?: ReceptionMark;
  /** Entité de traitement réelle, renseignée au routage. */
  entite?: string;
}
