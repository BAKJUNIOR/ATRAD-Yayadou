import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { DialogHeadComponent } from '../../../../../shared/ui/dialog-head/dialog-head.component';

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
  imports: [DialogHeadComponent],
  host: {
    class: 'dialog-card w-[min(520px,calc(100vw-2rem))]',
  },
  template: `
    <app-dialog-head kind="info" [title]="'Réaffecter ' + data.ref" (closed)="dialogRef.close()">
      <p>
        Gestionnaire actuel : <strong class="font-semibold text-ink">{{ data.current }}</strong
        >. La réaffectation est horodatée et ajoutée à l'historique du dossier.
      </p>
    </app-dialog-head>
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
    <div class="dialog-actions">
      <button type="button" class="dialog-cancel" (click)="dialogRef.close()">Annuler</button>
      <button
        type="button"
        class="dialog-confirm bg-brand hover:bg-brand-dark"
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
