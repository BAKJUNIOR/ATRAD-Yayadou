import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import type { ConfirmOptions } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  host: {
    class:
      'flex w-[min(430px,calc(100vw-3rem))] animate-enter flex-col gap-3.5 rounded-[calc(var(--radius-brand)*1.6)] bg-card p-[26px] shadow-[0_24px_64px_-16px_rgba(14,22,34,0.38),0_0_0_1px_rgba(14,22,34,0.06)]',
  },
  template: `
    <h2 class="text-[16px] font-semibold text-ink">{{ options.title }}</h2>
    <p class="text-[13px] leading-[1.55] text-ink-muted">{{ options.text }}</p>
    @if (options.note) {
      <p class="text-[13px] leading-[1.55] text-ink-muted">{{ options.note }}</p>
    }
    <div class="flex flex-wrap justify-end gap-2.5 pt-1">
      <button
        type="button"
        class="rounded-control border border-line-strong bg-card px-[15px] py-2.5 text-[13px] text-ink-secondary transition-colors hover:border-brand hover:text-brand-ink active:translate-y-px"
        (click)="dialogRef.close(false)"
      >
        {{ options.cancelLabel ?? 'Annuler' }}
      </button>
      <button
        type="button"
        class="rounded-control px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap text-white transition-colors active:translate-y-px"
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
}
