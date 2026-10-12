import { Status } from '../../../../shared/models/status';
import { StatTone } from '../../../../shared/ui/stat-card/stat-card.component';

export interface DashboardStat {
  label: string;
  value: string;
  hint: string;
  tone: StatTone;
}

/** Action proposée sur une ligne de la liste d'accueil. */
export interface DashboardAction {
  id: string;
  label: string;
  /** Raison pour laquelle l'action est indisponible ; vide si elle est possible. */
  disabledReason: string;
  /** Écran ouvert par l'action. */
  path: string;
}

export interface DashboardRow {
  ref: string;
  label: string;
  meta: string;
  status: Status;
  actions?: DashboardAction[];
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
