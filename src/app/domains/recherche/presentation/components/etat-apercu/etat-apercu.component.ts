import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { formatStamp } from '../../../../../core/utils/date.util';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { etatFromApi } from '../../../../dossiers/domain/entities/dossier-api.entity';
import { Etat } from '../../../../dossiers/domain/entities/etat.entity';
import { EtatApi } from '../../../../dossiers/infrastructure/api/etat.api';
import { BordereauService } from '../../../../dossiers/presentation/bordereau.service';

@Component({
  selector: 'app-etat-apercu',
  imports: [IconComponent, StatusBadgeComponent],
  host: { class: 'dialog-card w-[min(900px,calc(100vw-2rem))] !gap-4 !pt-7 sm:!pt-8' },
  template: `
    <button
      type="button"
      class="absolute end-4 top-4 flex size-10 items-center justify-center rounded-full bg-soft text-ink-muted transition-colors hover:bg-line hover:text-ink"
      aria-label="Fermer"
      title="Fermer"
      (click)="dialogRef.close()"
    >
      <app-icon name="close" [size]="18" [strokeWidth]="2" />
    </button>

    @if (etat(); as etat) {
      <header class="flex flex-col gap-1 pe-12">
        <p class="text-[12px] font-medium tracking-[0.07em] text-ink-muted uppercase">
          État de transmission
        </p>
        <h2 class="flex flex-wrap items-center gap-3 text-[19px] font-semibold text-ink">
          <span class="font-mono">{{ etat.ref }}</span>
          <app-status-badge [status]="etat.status" />
        </h2>
      </header>

      <dl
        class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 rounded-control bg-subtle p-4 text-[13px]"
      >
        <div class="flex flex-col gap-0.5">
          <dt class="text-[11.5px] text-ink-muted">Agence</dt>
          <dd class="font-medium text-ink">{{ etat.agence }} ({{ etat.code }})</dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-[11.5px] text-ink-muted">Agent émetteur</dt>
          <dd class="font-medium text-ink">{{ etat.emetteur || '—' }}</dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-[11.5px] text-ink-muted">Type d'état</dt>
          <dd class="font-medium text-ink">{{ etat.etTypeNom || '—' }}</dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-[11.5px] text-ink-muted">Envoyé le</dt>
          <dd class="font-medium text-ink tabular-nums">{{ formatStamp(etat.sentAt) }}</dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-[11.5px] text-ink-muted">Destinataire</dt>
          <dd class="font-medium text-ink">{{ etat.dest }}</dd>
        </div>
      </dl>

      <div class="overflow-x-auto rounded-control border border-line">
        <table class="w-full min-w-[640px] border-collapse text-[13px]">
          <caption class="sr-only">
            Dossiers de l'état
            {{
              etat.ref
            }}
          </caption>
          <thead>
            <tr
              class="border-b border-line bg-subtle text-[11px] tracking-[0.07em] text-ink-muted uppercase"
            >
              <th scope="col" class="py-2.5 ps-4 pe-1.5 text-start font-medium">Référence</th>
              <th scope="col" class="px-1.5 py-2.5 text-start font-medium">Client</th>
              <th scope="col" class="px-1.5 py-2.5 text-start font-medium">N° compte</th>
              <th scope="col" class="px-1.5 py-2.5 text-start font-medium">Type</th>
              <th scope="col" class="py-2.5 ps-1.5 pe-4 text-start font-medium">Réception</th>
            </tr>
          </thead>
          <tbody>
            @for (dossier of etat.dossiers; track dossier.ref) {
              <tr class="border-b border-soft last:border-0">
                <td
                  class="py-2.5 ps-4 pe-1.5 font-mono text-[12.5px] whitespace-nowrap text-brand-ink"
                >
                  {{ dossier.ref }}
                </td>
                <td class="px-1.5 py-2.5 font-medium text-ink">{{ dossier.client }}</td>
                <td class="px-1.5 py-2.5 font-mono text-[12px] whitespace-nowrap text-ink-muted">
                  {{ dossier.compte || '—' }}
                </td>
                <td class="px-1.5 py-2.5 text-ink-secondary">{{ dossier.type }}</td>
                <td class="py-2.5 ps-1.5 pe-4"><app-status-badge [status]="dossier.status" /></td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap justify-end gap-3">
        <button type="button" class="dialog-cancel" (click)="dialogRef.close()">Fermer</button>
        <button
          type="button"
          class="btn-primary gap-2 px-[18px] py-3 text-[13.5px]"
          (click)="print(etat.id!)"
        >
          <app-icon name="printer" [size]="15" [strokeWidth]="2" />
          Bordereau PDF
        </button>
      </div>
    } @else {
      <p class="py-10 text-center text-[13.5px] text-ink-muted" role="status">
        Chargement de l'état…
      </p>
    }
  `,
})
export class EtatApercuComponent {
  private readonly bordereau = inject(BordereauService);
  protected readonly dialogRef = inject<DialogRef<void>>(DialogRef);
  protected readonly formatStamp = formatStamp;
  protected readonly etat = signal<Etat | null>(null);

  constructor() {
    inject(EtatApi)
      .etat(inject<string>(DIALOG_DATA))
      .subscribe({
        next: (etat) => this.etat.set(etatFromApi(etat)),
        error: () => this.dialogRef.close(),
      });
  }

  protected print(etatId: string): void {
    this.dialogRef.close();
    this.bordereau.open(etatId);
  }
}
