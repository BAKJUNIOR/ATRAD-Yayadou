import { Component, computed, inject } from '@angular/core';
import { DemoClock } from '../../../../../core/services/demo-clock.service';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';
import { agenceComparison } from '../../../domain/indicators';
import { TONE_BAR, TONE_TEXT } from '../../tone';

/** Pilotage : comparatif des agences d'origine. */
@Component({
  selector: 'app-agences',
  template: `
    <section class="panel animate-enter overflow-hidden" aria-labelledby="agences-title">
      <header class="border-b border-line px-5 py-4">
        <h2 id="agences-title" class="mb-[3px] text-[15px] font-semibold text-ink">
          Vue par agence
        </h2>
        <p class="text-[12.5px] text-ink-muted">
          Comparatif des agences, triées par taux de dossiers en retard décroissant.
        </p>
      </header>
      <div class="overflow-x-auto">
        <table class="grid-table min-w-[760px] text-[13px]">
          <thead>
            <tr class="agences-grid grid-head">
              <th scope="col">Agence</th>
              <th scope="col">Dossiers envoyés</th>
              <th scope="col">Délai moyen</th>
              <th scope="col">Taux en retard</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.agence) {
              <tr
                class="agences-grid items-center border-b border-soft px-5 py-[13px] last:border-b-0"
              >
                <td class="truncate text-ink">{{ row.agence }}</td>
                <td class="font-mono text-[12.5px] text-ink">{{ row.total }}</td>
                <td class="font-mono text-[12.5px] text-ink">{{ row.averageDelay }}</td>
                <td class="flex items-center gap-[9px]">
                  <span
                    class="h-[7px] flex-1 overflow-hidden rounded-[calc(var(--radius-brand)*0.5)] bg-soft"
                  >
                    <span
                      class="block h-[7px] rounded-[calc(var(--radius-brand)*0.5)]"
                      [class]="toneBar[row.tone]"
                      [style.width.%]="row.lateRate"
                    ></span>
                  </span>
                  <span
                    class="font-mono text-[12.5px] whitespace-nowrap"
                    [class]="toneText[row.tone]"
                  >
                    {{ row.lateRate }} %
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class AgencesComponent {
  private readonly store = inject(TransmissionStore);
  private readonly clock = inject(DemoClock);

  protected readonly toneBar = TONE_BAR;
  protected readonly toneText = TONE_TEXT;

  protected readonly rows = computed(() =>
    agenceComparison(this.store.dossiers(), this.clock.today()),
  );
}
