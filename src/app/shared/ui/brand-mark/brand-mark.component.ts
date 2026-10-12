import { Component, input } from '@angular/core';
import { APP_NAME } from '../../../core/services/page-title.strategy';

/** Identité de l'application sur fond sombre : pastille aux initiales, nom et organisation. */
@Component({
  selector: 'app-brand-mark',
  host: { class: 'flex min-w-0 items-center gap-3' },
  template: `
    <span
      class="flex size-9 flex-none items-center justify-center rounded-control bg-brand-mid text-[13px] font-bold text-brand-on-mid"
      aria-hidden="true"
    >
      {{ initial }}
    </span>
    @if (!compact()) {
      <span class="flex min-w-0 flex-col">
        <span class="truncate text-[14.5px] font-semibold tracking-[0.06em] text-white">
          {{ appName }}
        </span>
        <span class="truncate text-[10.5px] tracking-[0.12em] text-side-muted uppercase">
          {{ organisation }}
        </span>
      </span>
    } @else {
      <span class="sr-only">{{ appName }}</span>
    }
  `,
})
export class BrandMarkComponent {
  /** Pastille seule (barre latérale repliée). */
  readonly compact = input(false);

  protected readonly appName = APP_NAME;
  protected readonly organisation = 'YAYADOU';
  protected readonly initial = APP_NAME.charAt(0);
}
