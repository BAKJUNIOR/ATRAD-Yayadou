import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

/** Message bref en bas de l'écran, remplacé par le suivant. */
@Component({
  selector: 'app-toast-container',
  host: {
    class:
      'pointer-events-none fixed inset-x-0 bottom-6 z-[1100] flex flex-col items-center gap-2 px-4',
    role: 'status',
    'aria-live': 'polite',
  },
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
      <div
        class="pointer-events-auto max-w-[min(640px,100%)] animate-toast rounded-brand bg-[#16232e] px-[18px] py-[11px] text-[13px] text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--brand-secondary)_28%,transparent)] dark:border dark:border-line-strong"
      >
        {{ toast.message }}
      </div>
    }
  `,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
}
