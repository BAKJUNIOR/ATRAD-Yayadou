import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { DialogHeadComponent } from '../../../../../shared/ui/dialog-head/dialog-head.component';

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
  imports: [DialogHeadComponent],
  host: {
    class: 'dialog-card w-[min(520px,calc(100vw-2rem))]',
  },
  template: `
    <app-dialog-head
      kind="success"
      [title]="'Confirmer la réception de ' + data.etatRef + ' ?'"
      (closed)="dialogRef.close(false)"
    >
      <p class="text-[14px] font-semibold text-ink">{{ data.summary }}</p>
    </app-dialog-head>
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
    <p class="text-center text-[12.5px] leading-normal text-ink-muted">
      L'horodatage est définitif et l'agence émettrice voit le statut de chaque dossier.
    </p>
    <div class="dialog-actions">
      <button type="button" class="dialog-cancel" (click)="dialogRef.close(false)">Annuler</button>
      <button
        type="button"
        class="dialog-confirm bg-brand hover:bg-brand-dark"
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
