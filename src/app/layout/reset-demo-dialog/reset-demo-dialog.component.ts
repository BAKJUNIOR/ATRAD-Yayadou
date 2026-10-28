import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { DATASET_IDS, DatasetId, datasetOf } from '../../domains/dossiers/domain/datasets';
import { DialogHeadComponent } from '../../shared/ui/dialog-head/dialog-head.component';

export interface ResetDemoDialogData {
  /** Jeu de données actif, sélectionné par défaut. */
  current: DatasetId;
}

/** Réinitialisation de la démo : choix du jeu de données de référence à charger. */
@Component({
  selector: 'app-reset-demo-dialog',
  imports: [DialogHeadComponent],
  host: { class: 'dialog-card w-[min(460px,calc(100vw-2rem))]' },
  template: `
    <app-dialog-head
      kind="danger"
      title="Réinitialiser les données de démo"
      (closed)="dialogRef.close()"
    >
      <p class="text-[13px] leading-normal text-ink-secondary">
        Tous les états, dossiers et paramétrages créés pendant la démo seront effacés. Choisissez le
        jeu de données de référence à charger. Jeu actuel : {{ currentLabel }}.
      </p>
    </app-dialog-head>
    <div class="flex flex-col gap-2" role="radiogroup" aria-label="Jeu de données">
      @for (option of options; track option.id) {
        @let on = option.id === picked();
        <button
          type="button"
          role="radio"
          class="flex flex-col gap-[3px] rounded-brand border px-3.5 py-3 text-start text-ink transition-colors"
          [class]="
            on
              ? 'border-brand bg-brand-tint ring-3 ring-brand/14'
              : 'border-line-strong bg-card hover:border-brand'
          "
          [attr.aria-checked]="on"
          (click)="picked.set(option.id)"
        >
          <span class="flex items-center gap-2 text-[13.5px] font-semibold">
            {{ option.id === data.current ? 'Jeu actuel (' + option.short + ')' : option.label }}
          </span>
          <span class="text-[12px] text-ink-muted">{{ option.description }}</span>
        </button>
      }
    </div>
    <div class="dialog-actions">
      <button type="button" class="dialog-cancel" (click)="dialogRef.close()">Annuler</button>
      <button
        type="button"
        class="dialog-confirm bg-danger-solid hover:brightness-95"
        (click)="dialogRef.close(picked())"
      >
        Réinitialiser
      </button>
    </div>
  `,
})
export class ResetDemoDialogComponent {
  protected readonly data = inject<ResetDemoDialogData>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<DatasetId>>(DialogRef);

  protected readonly options = DATASET_IDS.map((id) => ({
    id,
    label: datasetOf(id).label,
    short: id,
    description: datasetOf(id).description,
  }));
  protected readonly currentLabel = datasetOf(this.data.current).label;
  protected readonly picked = signal<DatasetId>(this.data.current);
}
