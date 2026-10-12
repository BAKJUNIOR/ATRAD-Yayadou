import { Component, inject } from '@angular/core';
import { ToastService } from '../../../../../core/services/toast.service';
import { REPORTS } from '../../../domain/indicators';

/** Pilotage : rapports exportables. L'export réel viendra avec l'API. */
@Component({
  selector: 'app-rapports',
  template: `
    <section class="panel animate-enter overflow-hidden" aria-labelledby="rapports-title">
      <header class="border-b border-line px-5 py-4">
        <h2 id="rapports-title" class="mb-[3px] text-[15px] font-semibold text-ink">Rapports</h2>
        <p class="text-[12.5px] text-ink-muted">
          Rapports exportables pour le pilotage de l'activité.
        </p>
      </header>
      <ul class="flex flex-col">
        @for (report of reports; track report.label) {
          <li
            class="flex flex-wrap items-center justify-between gap-3.5 border-b border-soft px-5 py-4 last:border-b-0"
          >
            <div class="flex min-w-0 flex-col gap-[3px]">
              <span class="text-[13.5px] font-semibold text-ink">{{ report.label }}</span>
              <span class="text-[12px] text-ink-muted">
                {{ report.description }} · généré le {{ report.date }}
              </span>
            </div>
            <button
              type="button"
              class="btn-outline px-[15px] py-[9px] text-[12.5px] font-semibold"
              (click)="export(report.label)"
            >
              Exporter
            </button>
          </li>
        }
      </ul>
    </section>
  `,
})
export class RapportsComponent {
  private readonly toast = inject(ToastService);

  protected readonly reports = REPORTS;

  protected export(label: string): void {
    this.toast.info(`Export « ${label} » généré (démo).`);
  }
}
