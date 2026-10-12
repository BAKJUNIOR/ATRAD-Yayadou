import { Component, input } from '@angular/core';

export type TimelineTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger';

export interface TimelineEntry {
  label: string;
  who: string;
  /** Date déjà mise en forme. */
  at: string;
  tone: TimelineTone;
}

const DOT_CLASSES: Record<TimelineTone, string> = {
  neutral: 'bg-ink-faint',
  brand: 'bg-brand-ink',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

/** Historique, du plus ancien au plus récent. */
@Component({
  selector: 'app-timeline',
  template: `
    <ol class="flex flex-col gap-3.5">
      @for (entry of entries(); track $index) {
        <li class="flex items-start gap-[11px]">
          <span
            class="mt-1 size-2.5 flex-none rounded-full"
            [class]="dotClasses[entry.tone]"
            aria-hidden="true"
          ></span>
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="text-[13px] text-ink">{{ entry.label }}</span>
            @if (entry.who) {
              <span class="text-[11.5px] text-ink-muted">{{ entry.who }}</span>
            }
            <span class="font-mono text-[11.5px] whitespace-nowrap text-ink-muted">{{
              entry.at
            }}</span>
          </div>
        </li>
      }
    </ol>
  `,
})
export class TimelineComponent {
  readonly entries = input.required<readonly TimelineEntry[]>();

  protected readonly dotClasses = DOT_CLASSES;
}
