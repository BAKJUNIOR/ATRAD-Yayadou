import { Component, inject } from '@angular/core';
import { ToastService, ToastVariant } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-success-line bg-success-bg text-success',
  error: 'border-danger-line bg-danger-bg text-danger',
  warning: 'border-warning-line bg-warning-bg text-warning',
  info: 'border-info-line bg-info-bg text-info',
};

@Component({
  selector: 'app-toast-container',
  imports: [IconComponent],
  host: {
    class:
      'pointer-events-none fixed end-4 bottom-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2',
    role: 'status',
    'aria-live': 'polite',
  },
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
      <div
        class="pointer-events-auto flex animate-toast items-start gap-3 rounded-brand border bg-card p-3 shadow-raised"
      >
        <span
          class="flex-1 rounded-control border px-2.5 py-1.5 text-[13px]"
          [class]="variantClasses[toast.variant]"
        >
          {{ toast.message }}
        </span>
        <button
          type="button"
          class="flex size-7 flex-none items-center justify-center rounded-control text-ink-muted hover:bg-soft hover:text-ink"
          aria-label="Fermer la notification"
          (click)="toastService.dismiss(toast.id)"
        >
          <app-icon name="close" [size]="15" [strokeWidth]="2" />
        </button>
      </div>
    }
  `,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
  protected readonly variantClasses = VARIANT_CLASSES;
}
