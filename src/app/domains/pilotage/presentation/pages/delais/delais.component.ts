import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { KpiCardComponent } from '../../../../../shared/ui/kpi-card/kpi-card.component';
import { SLA_TARGET, agenceRankingFromApi, lateDossiersFromApi } from '../../../domain/indicators';
import { PilotageApi } from '../../../infrastructure/api/pilotage.api';
import { TONE_BAR, TONE_TEXT } from '../../tone';

/** Pilotage : respect des délais de traitement et dossiers en dépassement. */
@Component({
  selector: 'app-delais',
  imports: [KpiCardComponent],
  templateUrl: './delais.component.html',
})
export class DelaisComponent {
  /** Respect des délais calculé par l'API. */
  private readonly delais = toSignal(
    inject(PilotageApi)
      .delais()
      .pipe(catchError(() => of(null))),
    {
      initialValue: null,
    },
  );

  protected readonly target = SLA_TARGET;
  protected readonly toneBar = TONE_BAR;
  protected readonly toneText = TONE_TEXT;

  protected readonly total = computed(() => this.delais()?.total ?? 0);
  /** Dossiers terminés et terminés dans les délais : seuls leurs nombres sont affichés. */
  protected readonly sla = computed(() => {
    const delais = this.delais();
    return {
      treated: { length: delais?.termines ?? 0 },
      onTime: { length: delais?.terminesDansLesDelais ?? 0 },
      rate: delais?.respectDelais ?? 100,
    };
  });
  protected readonly late = computed(() =>
    this.delais() ? lateDossiersFromApi(this.delais()!) : [],
  );
  protected readonly ranking = computed(() =>
    this.delais() ? agenceRankingFromApi(this.delais()!) : [],
  );
}
