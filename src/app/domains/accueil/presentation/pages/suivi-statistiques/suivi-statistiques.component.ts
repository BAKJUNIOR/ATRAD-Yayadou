import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { formatStamp } from '../../../../../core/utils/date.util';
import { Status } from '../../../../../shared/models/status';
import { Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { prioriteOf, statusOf } from '../../../../dossiers/domain/entities/dossier-api.entity';
import { routingRules } from '../../../domain/reception';
import { AccueilApi, ApiSuiviAccueil } from '../../../infrastructure/api/accueil.api';

const PRIORITY_TEXT: Record<Priorite, string> = {
  Normale: 'text-ink-muted',
  Haute: 'text-warning',
  Urgente: 'text-danger',
};

/** Dossier routé, tel qu'affiché dans le groupe de son entité de traitement. */
interface TrackingRow {
  ref: string;
  client: string;
  type: string;
  etat: string;
  agence: string;
  /** Date de réception (routage). */
  affecte: string;
  prio: Priorite;
  status: Status;
  gest: string;
}

interface TrackingGroup {
  entite: string;
  types: string;
  rows: TrackingRow[];
  pending: number;
}

/** Parcours accueil : où déposer chaque dossier réceptionné (lecture seule), calculé par l'API. */
@Component({
  selector: 'app-suivi-statistiques',
  templateUrl: './suivi-statistiques.component.html',
})
export class SuiviStatistiquesComponent {
  private readonly api = inject(AccueilApi);

  private readonly suivi = toSignal<ApiSuiviAccueil | null>(this.api.suivi(), {
    initialValue: null,
  });

  protected readonly rules = computed(() => routingRules());
  protected readonly formatStamp = formatStamp;
  protected readonly priorityText = PRIORITY_TEXT;

  protected readonly entite = signal('');
  protected readonly query = signal('');
  protected readonly pendingOnly = signal(false);

  /** Entités de traitement proposées dans le filtre. */
  protected readonly entites = computed(() =>
    (this.suivi()?.entites ?? []).map((entite) => ({ name: `${entite.nom} (${entite.code})` })),
  );

  protected readonly kpis = computed(() => {
    const suivi = this.suivi();
    if (!suivi) {
      return [];
    }
    return [
      {
        label: 'États reçus',
        value: suivi.etatsRecus,
        hint: 'réception confirmée',
        textClass: 'text-ink',
      },
      {
        label: 'États à réceptionner',
        value: suivi.etatsAReceptionner,
        hint: 'au moins un dossier non pointé',
        textClass: 'text-warning',
      },
      {
        label: 'Dossiers réceptionnés',
        value: suivi.dossiersReceptionnes,
        hint: 'dispatchés ou pris en charge',
        textClass: 'text-brand-ink',
      },
      {
        label: 'Dossiers non reçus',
        value: suivi.dossiersNonRecus,
        hint: 'signalés à la réception',
        textClass: 'text-danger',
      },
      {
        label: 'Non pris en charge',
        value: suivi.nonPrisEnCharge,
        hint: "en attente dans l'entité",
        textClass: 'text-warning',
      },
      {
        label: 'Retours à renvoyer',
        value: suivi.retoursARenvoyer,
        hint: "vers l'agence d'origine",
        textClass: 'text-info',
      },
    ];
  });

  protected readonly empty = computed(() => (this.suivi()?.dossiersReceptionnes ?? 0) === 0);

  protected readonly groups = computed<TrackingGroup[]>(() => {
    const query = this.query().trim().toLowerCase();
    return (this.suivi()?.entites ?? [])
      .map((entite) => ({
        entite: `${entite.nom} (${entite.code})`,
        types: entite.types.join(' · '),
        pending: entite.aDeposer,
        rows: entite.dossiers
          .map((row): TrackingRow => ({
            ref: row.reference,
            client: row.client,
            type: row.typeDossier,
            etat: row.etatReference ?? '',
            agence: row.agence ?? '',
            affecte: row.recuLe ?? '',
            prio: prioriteOf(row.priorite),
            status: statusOf(row.statut),
            gest: row.gestionnaire ?? '',
          }))
          .filter((row) => !this.pendingOnly() || isUnassigned(row))
          .filter(
            (row) => !query || `${row.ref} ${row.client} ${row.etat}`.toLowerCase().includes(query),
          ),
      }))
      .filter((group) => !this.entite() || group.entite === this.entite());
  });

  protected onEntite(event: Event): void {
    this.entite.set((event.target as HTMLSelectElement).value);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  /** Libellé et couleur de la prise en charge d'un dossier par son entité. */
  protected takeover(dossier: TrackingRow): { label: string; classes: string } {
    if (dossier.gest) {
      return { label: `Pris en charge · ${dossier.gest}`, classes: 'bg-success-bg text-success' };
    }
    return isUnassigned(dossier)
      ? { label: 'Non pris en charge', classes: 'bg-warning-bg text-warning' }
      : { label: dossier.status, classes: 'bg-success-bg text-success' };
  }
}

/** Reçu et sans gestionnaire : à déposer dans l'entité. */
function isUnassigned(row: TrackingRow): boolean {
  return row.status === 'Reçu' && !row.gest;
}
