import { Component, computed, input } from '@angular/core';

export type KpiTone = 'success' | 'warning' | 'danger' | 'brand' | 'heading';

const TONE_BG: Record<KpiTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  brand: 'bg-brand-ink',
  heading: 'bg-heading',
};

/** Indicateur de pilotage : grande valeur, et jauge facultative. */
@Component({
  selector: 'app-kpi-card',
  host: {
    class:
      'flex flex-col gap-3 rounded-[calc(var(--radius-brand)*1.4)] border border-line bg-card px-5 py-[18px] shadow-card transition hover:-translate-y-px hover:border-line-strong hover:shadow-raised',
  },
  template: `
    <span class="flex items-center gap-2 text-[12.5px] font-medium text-ink-muted">
      <span class="size-[7px] flex-none rounded-full ring-3 ring-soft" [class]="toneClass()"></span>
      {{ label() }}
    </span>
    <span class="text-[32px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink tabular-nums">
      {{ value() }}
    </span>
    @if (bar() !== null) {
      <div class="h-1 overflow-hidden rounded-[calc(var(--radius-brand)*0.5)] bg-soft">
        <div
          class="h-1 rounded-[calc(var(--radius-brand)*0.5)]"
          [class]="toneClass()"
          [style.width.%]="bar()"
        ></div>
      </div>
    }
    <span class="text-[11.5px] text-ink-muted">{{ hint() }}</span>
  `,
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input('');
  readonly tone = input<KpiTone>('heading');
  /** Remplissage de la jauge, en pourcentage ; `null` pour ne pas l'afficher. */
  readonly bar = input<number | null>(null);

  protected readonly toneClass = computed(() => TONE_BG[this.tone()]);
}
