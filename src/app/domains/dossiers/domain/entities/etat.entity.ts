import { Status } from '../../../../shared/models/status';
import { EtatDossier } from './dossier.entity';

/** Trace d'un pointage de réception par l'entité réceptrice. */
export interface ReceptionLog {
  at: string;
  by: string;
  /** Nombre de dossiers reçus lors de ce pointage. */
  n: number;
  /** Nombre de dossiers restés non reçus. */
  missing: number;
  refs: string[];
}

export interface EtatPrint {
  at: string;
  by: string;
}

/** État de transmission : lot de dossiers émis par une entité vers une entité réceptrice. */
export interface Etat {
  /** Identifiant (UUID) de l'état dans l'API. */
  id?: string;
  ref: string;
  agence: string;
  /** Code de l'agence émettrice (ex. `AG-014`). */
  code: string;
  /** Type commun des dossiers, ou `Mixte (n types)`. */
  type: string;
  createdAt: string;
  sentAt: string;
  status: Status;
  receivedAt: string;
  receivedBy?: string;
  emetteur: string;
  /** Type d'état (`TE-01`) et son nom au moment de l'envoi. */
  etType?: string;
  etTypeNom?: string;
  /** Code de l'entité réceptrice ; absent des états antérieurs aux types d'état. */
  recep?: string;
  /** Entité réceptrice : `Accueil central (EC-001)`. */
  dest: string;
  dossiers: EtatDossier[];
  /** Nombre de dossiers de l'état, connu même quand `dossiers` n'est pas chargé (listes). */
  count?: number;
  prints: EtatPrint[];
  recLog?: ReceptionLog[];
}

const PRINTABLE_STATUSES: readonly Status[] = [
  'Transmis',
  'Reçu partiellement',
  'Reçu',
  'En cours',
  'Traité',
  'Clôturé',
];

/** Le bordereau n'est imprimable qu'une fois l'état transmis. */
export function canPrintEtat(etat: Etat | null | undefined): etat is Etat {
  return !!etat && !!etat.sentAt && (PRINTABLE_STATUSES.includes(etat.status) || !!etat.receivedAt);
}
