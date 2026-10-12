import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';

export interface ReassignDialogData {
  ref: string;
  current: string;
  /** Autres membres de l'équipe. */
  options: readonly string[];
}

export interface ReassignChoice {
  gestionnaire: string;
  motif: string;
}

/** Transfert d'un dossier en cours à un autre gestionnaire. */
@Component({
  selector: 'app-reassign-dialog',
  host: {
    class:
      'flex w-[min(460px,calc(100vw-3rem))] animate-enter flex-col gap-3.5 rounded-[calc(var(--radius-brand)*1.6)] bg-card p-[26px] shadow-[0_24px_64px_-16px_rgba(14,22,34,0.38),0_0_0_1px_rgba(14,22,34,0.06)]',
  },
  template: `
    <h2 class="text-[16px] font-semibold text-ink">Réaffecter {{ data.ref }}</h2>
    <p class="text-[13px] leading-[1.55] text-ink-muted">
      Gestionnaire actuel : <strong class="font-semibold text-ink">{{ data.current }}</strong
      >. La réaffectation est horodatée et ajoutée à l'historique du dossier.
    </p>
    <label class="form-label gap-1.5 text-[12.5px]">
      Nouveau gestionnaire *
      <select class="form-control py-2.5" (change)="gestionnaire.set(value($event))">
        <option value="">Sélectionner…</option>
        @for (option of data.options; track option) {
          <option [value]="option">{{ option }}</option>
        }
      </select>
    </label>
    <label class="form-label gap-1.5 text-[12.5px]">
      Motif (facultatif)
      <input
        class="form-control py-2.5"
        placeholder="Ex. agent absent"
        [value]="motif()"
        (input)="motif.set(value($event))"
      />
    </label>
    <div class="flex justify-end gap-2.5 pt-1">
      <button
        type="button"
        class="rounded-control border border-line-strong bg-card px-[15px] py-2.5 text-[13px] text-ink-secondary transition-colors hover:border-brand hover:text-brand-ink"
        (click)="dialogRef.close()"
      >
        Annuler
      </button>
      <button
        type="button"
        class="btn-primary px-4 py-2.5 text-[13px]"
        title="Choisissez le nouveau gestionnaire"
        [disabled]="!gestionnaire()"
        (click)="dialogRef.close({ gestionnaire: gestionnaire(), motif: motif() })"
      >
        Confirmer la réaffectation
      </button>
    </div>
  `,
})
export class ReassignDialogComponent {
  protected readonly data = inject<ReassignDialogData>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<ReassignChoice>>(DialogRef);

  protected readonly gestionnaire = signal('');
  protected readonly motif = signal('');

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
