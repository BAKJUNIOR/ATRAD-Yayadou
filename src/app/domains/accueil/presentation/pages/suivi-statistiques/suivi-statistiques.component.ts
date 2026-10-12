import { Component, computed, inject, signal } from '@angular/core';
import { formatStamp } from '../../../../../core/utils/date.util';
import { Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { RoutedDossier } from '../../../../dossiers/domain/entities/dossier.entity';
import { ENTITES } from '../../../../dossiers/domain/routing';
import { RoutingStore } from '../../../../dossiers/infrastructure/store/routing.store';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';
import {
  isUnassigned,
  routingRules,
  trackedDossiers,
  trackingGroups,
  trackingKpis,
} from '../../../domain/reception';

const PRIORITY_TEXT: Record<Priorite, string> = {
  Normale: 'text-ink-muted',
  Haute: 'text-warning',
  Urgente: 'text-danger',
};

/** Parcours accueil : où déposer chaque dossier réceptionné (lecture seule). */
@Component({
  selector: 'app-suivi-statistiques',
  templateUrl: './suivi-statistiques.component.html',
})
export class SuiviStatistiquesComponent {
  private readonly store = inject(TransmissionStore);
  private readonly routing = inject(RoutingStore);

  protected readonly entites = ENTITES;
  protected readonly rules = computed(() => {
    this.routing.config();
    return routingRules();
  });
  protected readonly formatStamp = formatStamp;
  protected readonly priorityText = PRIORITY_TEXT;

  protected readonly entite = signal('');
  protected readonly query = signal('');
  protected readonly pendingOnly = signal(false);

  protected readonly kpis = computed(() => trackingKpis(this.store.etats(), this.store.dossiers()));
  protected readonly empty = computed(() => trackedDossiers(this.store.dossiers()).length === 0);
  protected readonly groups = computed(() =>
    trackingGroups(this.store.dossiers(), {
      entite: this.entite(),
      query: this.query(),
      pendingOnly: this.pendingOnly(),
    }),
  );

  protected onEntite(event: Event): void {
    this.entite.set((event.target as HTMLSelectElement).value);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  /** Libellé et couleur de la prise en charge d'un dossier par son entité. */
  protected takeover(dossier: RoutedDossier): { label: string; classes: string } {
    if (dossier.gest) {
      return { label: `Pris en charge · ${dossier.gest}`, classes: 'bg-success-bg text-success' };
    }
    return isUnassigned(dossier)
      ? { label: 'Non pris en charge', classes: 'bg-warning-bg text-warning' }
      : { label: dossier.status, classes: 'bg-success-bg text-success' };
  }
}
