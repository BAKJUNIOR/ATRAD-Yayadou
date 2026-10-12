import { Component, computed, inject, signal } from '@angular/core';
import { DemoClock } from '../../../../../core/services/demo-clock.service';
import { KpiCardComponent } from '../../../../../shared/ui/kpi-card/kpi-card.component';
import { DOSSIER_TYPES, DossierType } from '../../../../dossiers/domain/dossier-catalog';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';
import {
  PeriodId,
  SLA_TARGET,
  agencePerformance,
  averageTreatmentDelay,
  byStatus,
  byType,
  inScope,
  kpiCards,
  periods,
} from '../../../domain/indicators';
import { TONE_BAR, TONE_TEXT } from '../../tone';

/** Pilotage : indicateurs du réseau sur un périmètre (agence, période, type de dossier). */
@Component({
  selector: 'app-tableau-de-bord',
  imports: [KpiCardComponent],
  templateUrl: './tableau-de-bord.component.html',
})
export class TableauDeBordComponent {
  private readonly store = inject(TransmissionStore);
  private readonly clock = inject(DemoClock);

  protected readonly types = DOSSIER_TYPES;
  protected readonly target = SLA_TARGET;
  protected readonly toneBar = TONE_BAR;
  protected readonly toneText = TONE_TEXT;

  protected readonly agence = signal('');
  protected readonly type = signal<DossierType | ''>('');
  protected readonly periodId = signal<PeriodId>('all');

  protected readonly periodOptions = computed(() => periods(this.clock.today()));
  protected readonly agences = computed(() => [
    ...new Set(this.store.dossiers().map((dossier) => dossier.agence)),
  ]);

  private readonly scope = computed(() => ({
    agence: this.agence(),
    type: this.type(),
    period:
      this.periodOptions().find((period) => period.id === this.periodId()) ??
      this.periodOptions()[3],
  }));
  protected readonly scoped = computed(() => inScope(this.store.dossiers(), this.scope()));

  protected readonly cards = computed(() =>
    kpiCards(this.scoped(), this.store.etats(), this.scope(), this.clock.today()),
  );
  protected readonly statuses = computed(() => byStatus(this.scoped()));
  protected readonly volumes = computed(() => byType(this.scoped()));
  protected readonly averageDelay = computed(() =>
    averageTreatmentDelay(this.scoped(), this.clock.today()),
  );
  protected readonly performance = computed(() =>
    agencePerformance(this.scoped(), this.clock.today()),
  );

  protected onAgence(event: Event): void {
    this.agence.set((event.target as HTMLSelectElement).value);
  }

  protected onPeriod(event: Event): void {
    this.periodId.set((event.target as HTMLSelectElement).value as PeriodId);
  }

  protected onType(event: Event): void {
    this.type.set((event.target as HTMLSelectElement).value as DossierType | '');
  }

  protected reset(): void {
    this.agence.set('');
    this.type.set('');
    this.periodId.set('all');
  }
}
