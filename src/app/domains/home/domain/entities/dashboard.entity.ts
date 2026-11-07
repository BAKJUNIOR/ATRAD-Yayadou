import { Status } from '../../../../shared/models/status';
import { StatTone } from '../../../../shared/ui/stat-card/stat-card.component';

export interface DashboardStat {
  label: string;
  value: string;
  hint: string;
  tone: StatTone;
}

export interface DashboardAction {
  id: string;
  label: string;
  disabledReason: string;
  path: string;
}

export interface DashboardRow {
  ref: string;
  label: string;
  meta: string;
  status: Status;
  actions?: DashboardAction[];
}

export interface Dashboard {
  greeting: string;
  subline: string;
  primaryLabel: string;
  stats: DashboardStat[];
  listTitle: string;
  rows: DashboardRow[];
}
