import { Status } from '../../../../shared/models/status';
import { EtatDossier } from './dossier.entity';

export interface ReceptionLog {
  at: string;
  by: string;
  n: number;
  missing: number;
  refs: string[];
}

export interface EtatPrint {
  at: string;
  by: string;
}

export interface Etat {
  id?: string;
  ref: string;
  agence: string;
  code: string;
  type: string;
  createdAt: string;
  sentAt: string;
  status: Status;
  receivedAt: string;
  receivedBy?: string;
  emetteur: string;
  etType?: string;
  etTypeNom?: string;
  recep?: string;
  dest: string;
  dossiers: EtatDossier[];
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

export function canPrintEtat(etat: Etat | null | undefined): etat is Etat {
  return !!etat && !!etat.sentAt && (PRINTABLE_STATUSES.includes(etat.status) || !!etat.receivedAt);
}
