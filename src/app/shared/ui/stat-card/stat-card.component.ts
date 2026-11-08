import { Component, computed, input } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

export type StatTone = 'heading' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<StatTone, { tile: string; icon: IconName }> = {
  heading: { tile: 'bg-soft text-heading', icon: 'layers' },
  brand: { tile: 'bg-brand-tint text-brand-ink', icon: 'inbox' },
  success: { tile: 'bg-success-bg text-success', icon: 'check-circle' },
  warning: { tile: 'bg-warning-bg text-warning', icon: 'clock' },
  danger: { tile: 'bg-danger-bg text-danger', icon: 'alert' },
  info: { tile: 'bg-info-bg text-info', icon: 'info' },
};

@Component({
  selector: 'app-stat-card',
  imports: [IconComponent],
  host: {
    class:
      'flex items-center gap-3 rounded-brand border border-line bg-card px-4 py-3 shadow-card transition hover:border-line-strong hover:shadow-raised',
    '[attr.title]': 'hint() || null',
  },
  template: `
    <span
      class="flex size-10 flex-none items-center justify-center rounded-[calc(var(--radius-brand)*0.9)]"
      [class]="tileClass()"
    >
      <app-icon [name]="iconName()" [size]="18" [strokeWidth]="2" />
    </span>
    <span class="flex min-w-0 flex-col">
      <span
        class="text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink tabular-nums"
      >
        {{ value() }}
      </span>
      <span class="truncate text-[12.5px] font-medium text-ink-muted">{{ label() }}</span>
    </span>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input('');
  readonly tone = input<StatTone>('heading');
  readonly icon = input<IconName | undefined>(undefined);

  protected readonly tileClass = computed(() => TONES[this.tone()].tile);
  protected readonly iconName = computed(() => this.icon() ?? TONES[this.tone()].icon);
}
