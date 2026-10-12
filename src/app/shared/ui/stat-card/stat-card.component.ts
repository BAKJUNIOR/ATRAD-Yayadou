import { Component, computed, input } from '@angular/core';

export type StatTone = 'heading' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const DOT_CLASSES: Record<StatTone, string> = {
  heading: 'bg-heading',
  brand: 'bg-brand-ink',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

/** Indicateur chiffré : libellé, valeur et précision. */
@Component({
  selector: 'app-stat-card',
  host: {
    class:
      'flex flex-col gap-3 rounded-[calc(var(--radius-brand)*1.4)] border border-line bg-card px-5 py-[18px] shadow-card transition hover:-translate-y-px hover:border-line-strong hover:shadow-raised',
  },
  template: `
    <span
      class="flex min-h-[34px] items-start gap-2 text-[12.5px] leading-snug font-medium text-ink-muted"
    >
      <span
        class="mt-[5px] size-[7px] flex-none rounded-full ring-3 ring-soft"
        [class]="dotClass()"
      ></span>
      <span class="min-w-0 text-pretty">{{ label() }}</span>
    </span>
    <span class="text-[30px] leading-[1.1] font-semibold tracking-[-0.03em] text-ink tabular-nums">
      {{ value() }}
    </span>
    @if (hint()) {
      <span class="text-[11.5px] text-ink-muted">{{ hint() }}</span>
    }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input('');
  readonly tone = input<StatTone>('heading');

  protected readonly dotClass = computed(() => DOT_CLASSES[this.tone()]);
}
