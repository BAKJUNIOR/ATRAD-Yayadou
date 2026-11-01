import { Component, computed, input, output } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

export type DialogTone = 'danger' | 'warning' | 'success' | 'info';

const TONES: Record<DialogTone, { icon: IconName; classes: string }> = {
  danger: { icon: 'close', classes: 'text-danger-solid' },
  warning: { icon: 'alert', classes: 'text-warning-dot' },
  success: { icon: 'check', classes: 'text-success' },
  info: { icon: 'info', classes: 'text-info' },
};

/** Angles (en degrés) des lobes de la pastille festonnée. */
const LOBES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * En-tête commun des dialogues : bouton de fermeture, pastille colorée selon le ton,
 * titre centré et texte d'explication (contenu projeté).
 */
@Component({
  selector: 'app-dialog-head',
  imports: [IconComponent],
  host: { class: 'flex flex-col items-center gap-2 text-center' },
  template: `
    <button
      type="button"
      class="absolute end-4 top-4 flex size-10 items-center justify-center rounded-full bg-soft text-ink-muted transition-colors hover:bg-line hover:text-ink"
      aria-label="Fermer"
      title="Fermer"
      (click)="closed.emit()"
    >
      <app-icon name="close" [size]="18" [strokeWidth]="2" />
    </button>

    <span
      class="relative mb-3 flex size-[84px] items-center justify-center"
      [class]="tone().classes"
    >
      <svg class="absolute inset-0 size-full opacity-15" viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r="30" fill="currentColor" />
        @for (angle of lobes; track angle) {
          <circle
            cx="42"
            cy="14"
            r="11"
            fill="currentColor"
            [attr.transform]="'rotate(' + angle + ' 42 42)'"
          />
        }
      </svg>
      <app-icon class="relative" [name]="tone().icon" [size]="30" [strokeWidth]="2.4" />
    </span>

    <h2 class="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-balance text-ink">
      {{ title() }}
    </h2>
    <div class="flex flex-col gap-2 text-[13.5px] leading-[1.6] text-pretty text-ink-muted">
      <ng-content />
    </div>
  `,
})
export class DialogHeadComponent {
  readonly title = input.required<string>();
  readonly kind = input<DialogTone>('info');
  readonly closed = output<void>();

  protected readonly lobes = LOBES;
  protected readonly tone = computed(() => TONES[this.kind()]);
}
