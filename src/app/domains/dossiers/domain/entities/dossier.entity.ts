import { Status } from '../../../../shared/models/status';
import { TimelineTone } from '../../../../shared/ui/timeline/timeline.component';
import { DossierType, Priorite, Produit } from '../dossier-catalog';

export interface PieceJointe {
  id: string;
  dossierId?: string;
  file?: File;
  name: string;
  size: number;
  mime: string;
  ext: string;
  at: string;
  by: string;
}

export interface DossierExtra {
  label: string;
  value: string;
}

export interface DossierLog {
  at: string;
  who: string;
  label: string;
  tone: TimelineTone;
  pre?: boolean;
}

export interface DossierData {
  num: string;
  prenom: string;
  nom: string;
  compte: string;
  client: string;
  type: DossierType;
  produit: Produit;
  prio: Priorite;
  note: string;
  pieces: PieceJointe[];
  extra: DossierExtra[];
  xraw: Record<string, string>;
  montant?: string;
}

export interface Dossier extends DossierData {
  id: string;
  ref: string;
  createdAt: string;
  log: DossierLog[];
}

export interface ReceptionMark {
  at: string;
  by: string;
}

export interface EtatDossier extends Dossier {
  status: Status;
  transmisAt: string;
  rec?: ReceptionMark;
  nonRec?: ReceptionMark;
  entite?: string;
}

export interface RoutedDossier extends Dossier {
  status: Status;
  agence: string;
  etat: string;
  entite: string;
  affecte: string;
  affectedBy: string;
  direct?: boolean;
  echeanceIso: string;
  delai: string;
  gest: string;
  gestId?: string;
  gestAt: string;
  comments?: DossierComment[];
  validatedAt?: string;
  validatedBy?: string;
  closedAt?: string;
  closedBy?: string;
  docsMissing?: string[];
  docsReqAt?: string;
  docsDeadlineIso?: string;
  docsNote?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectReason?: string;
  docsRetAt?: string;
  complements?: string;
  renvoyeAt?: string;
  renvoyeBy?: string;
}

export interface DossierComment {
  who: string;
  at: string;
  text: string;
}
