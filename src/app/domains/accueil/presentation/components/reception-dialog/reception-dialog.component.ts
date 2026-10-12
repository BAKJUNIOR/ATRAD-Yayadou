import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';

export interface ReceptionDialogData {
  etatRef: string;
  /** `2 dossiers reçus, 1 dossier non reçu` */
  summary: string;
  /** Dossiers pointés, avec leur entité de destination. */
  received: string;
  /** Dossiers non pointés ; vide si tout est reçu. */
  missing: string;
}

/** Confirmation du pointage de réception d'un état. */
@Component({
  selector: 'app-reception-dialog',
  host: {
    class:
      'flex w-[min(420px,calc(100vw-3rem))] animate-enter flex-col gap-3.5 rounded-[calc(var(--radius-brand)*1.6)] bg-card p-[26px] shadow-[0_24px_64px_-16px_rgba(14,22,34,0.38),0_0_0_1px_rgba(14,22,34,0.06)]',
  },
  template: `
    <h2 class="text-[16px] font-semibold text-ink">
      Confirmer la réception de {{ data.etatRef }} ?
    </h2>
    <p class="text-[14px] font-semibold text-ink">{{ data.summary }}</p>
    <div
      class="flex flex-col gap-1 rounded-control border border-brand-tint-line bg-brand-tint-soft px-3 py-2.5 text-[12.5px] text-brand-ink"
    >
      <span class="font-semibold">Reçus — routés vers leur entité</span>
      <span>{{ data.received }}</span>
    </div>
    @if (data.missing) {
      <div
        class="flex flex-col gap-1 rounded-control border border-danger-line bg-danger-bg px-3 py-2.5 text-[12.5px] text-danger"
      >
        <span class="font-semibold">Non reçus — restent rattachés à l'état</span>
        <span>{{ data.missing }}</span>
      </div>
    }
    <p class="text-[12.5px] leading-normal text-ink-muted">
      L'horodatage est définitif et l'agence émettrice voit le statut de chaque dossier.
    </p>
    <div class="flex justify-end gap-2.5 pt-1">
      <button
        type="button"
        class="rounded-control border border-line-strong bg-card px-[15px] py-2.5 text-[13px] text-ink-secondary transition-colors hover:border-brand hover:text-brand-ink"
        (click)="dialogRef.close(false)"
      >
        Annuler
      </button>
      <button
        type="button"
        class="btn-primary px-4 py-2.5 text-[13px]"
        (click)="dialogRef.close(true)"
      >
        Confirmer la réception
      </button>
    </div>
  `,
})
export class ReceptionDialogComponent {
  protected readonly data = inject<ReceptionDialogData>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
}
