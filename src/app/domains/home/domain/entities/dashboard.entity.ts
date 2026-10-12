import { Status } from '../../../../shared/models/status';
import { StatTone } from '../../../../shared/ui/stat-card/stat-card.component';

export interface DashboardStat {
  label: string;
  value: string;
  hint: string;
  tone: StatTone;
}

export interface DashboardRow {
  ref: string;
  label: string;
  meta: string;
  status: Status;
}

/** Contenu de la page d'accueil d'un profil. */
export interface Dashboard {
  greeting: string;
  subline: string;
  /** Libellé du bouton menant à l'écran principal du profil. */
  primaryLabel: string;
  stats: DashboardStat[];
  listTitle: string;
  rows: DashboardRow[];
}
