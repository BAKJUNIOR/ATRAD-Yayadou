import { Status } from '../../../../shared/models/status';
import { EtatDossier } from './dossier.entity';

export interface EtatPrint {
  at: string;
  by: string;
}

/** État de transmission : lot de dossiers émis par une agence vers l'Accueil central. */
export interface Etat {
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
  dest: string;
  dossiers: EtatDossier[];
  prints: EtatPrint[];
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
