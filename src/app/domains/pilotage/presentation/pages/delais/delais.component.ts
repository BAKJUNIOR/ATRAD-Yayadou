import { Component, computed, inject } from '@angular/core';
import { DemoClock } from '../../../../../core/services/demo-clock.service';
import { KpiCardComponent } from '../../../../../shared/ui/kpi-card/kpi-card.component';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';
import { SLA_TARGET, agenceRanking, lateDossiers, sla } from '../../../domain/indicators';
import { TONE_BAR, TONE_TEXT } from '../../tone';

/** Pilotage : respect des délais de traitement et dossiers en dépassement. */
@Component({
  selector: 'app-delais',
  imports: [KpiCardComponent],
  templateUrl: './delais.component.html',
})
export class DelaisComponent {
  private readonly store = inject(TransmissionStore);
  private readonly clock = inject(DemoClock);

  protected readonly target = SLA_TARGET;
  protected readonly toneBar = TONE_BAR;
  protected readonly toneText = TONE_TEXT;

  protected readonly total = computed(() => this.store.dossiers().length);
  protected readonly sla = computed(() => sla(this.store.dossiers(), this.clock.today()));
  protected readonly late = computed(() => lateDossiers(this.store.dossiers(), this.clock.today()));
  protected readonly ranking = computed(() =>
    agenceRanking(this.store.dossiers(), this.clock.today()),
  );
}
