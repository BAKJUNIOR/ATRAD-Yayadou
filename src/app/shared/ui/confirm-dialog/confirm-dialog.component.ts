import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { DialogHeadComponent, DialogTone } from '../dialog-head/dialog-head.component';
import type { ConfirmOptions } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [DialogHeadComponent],
  host: {
    class: 'dialog-card w-[min(520px,calc(100vw-2rem))]',
  },
  template: `
    <app-dialog-head [title]="options.title" [kind]="tone" (closed)="dialogRef.close(false)">
      <p>{{ options.text }}</p>
      @if (options.note) {
        <p>{{ options.note }}</p>
      }
    </app-dialog-head>
    <div class="dialog-actions">
      <button type="button" class="dialog-cancel" (click)="dialogRef.close(false)">
        {{ options.cancelLabel ?? 'Annuler' }}
      </button>
      <button
        type="button"
        class="dialog-confirm"
        [class]="
          options.danger ? 'bg-danger-solid hover:brightness-90' : 'bg-brand hover:bg-brand-dark'
        "
        (click)="dialogRef.close(true)"
      >
        {{ options.okLabel }}
      </button>
    </div>
  `,
})
export class ConfirmDialogComponent {
  protected readonly options = inject<ConfirmOptions>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  protected readonly tone: DialogTone =
    this.options.tone ?? (this.options.danger ? 'danger' : 'info');
}
