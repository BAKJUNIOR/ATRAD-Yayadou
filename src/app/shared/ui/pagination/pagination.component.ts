import { Component, computed, input, model } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

type PageItem = number | 'gap';

@Component({
  selector: 'app-pagination',
  imports: [IconComponent],
  host: { class: 'block' },
  styles: `
    .pager-button {
      display: inline-flex;
      min-width: 32px;
      height: 32px;
      align-items: center;
      justify-content: center;
      padding: 0 8px;
      border: 1px solid var(--border);
      border-radius: calc(var(--brand-border-radius) * 0.7);
      background: var(--bg-card);
      color: var(--text-secondary);
      font-size: 12.5px;
      font-weight: 500;
      transition:
        border-color 0.15s ease,
        color 0.15s ease,
        background 0.15s ease;
    }

    .pager-button:hover:not(:disabled) {
      border-color: var(--brand-primary);
      color: var(--brand-primary);
    }

    .pager-button:focus-visible {
      outline: 2px solid var(--brand-primary);
      outline-offset: 2px;
    }

    .pager-button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .pager-button.pager-current {
      border-color: var(--brand-primary);
      background: var(--brand-primary);
      color: #ffffff;
    }
  `,
  template: `
    @if (total() > 0) {
      <nav
        class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[12.5px] text-ink-muted"
        aria-label="Pagination"
      >
        <span aria-live="polite">
          <strong class="font-semibold text-ink">{{ from() }}–{{ to() }}</strong> sur
          <strong class="font-semibold text-ink">{{ total() }}</strong>
        </span>
        @if (pageCount() > 1) {
          <span class="flex items-center gap-1">
            <button
              type="button"
              class="pager-button"
              aria-label="Page précédente"
              [disabled]="page() === 0"
              (click)="goTo(page() - 1)"
            >
              <app-icon name="chevron-down" class="rotate-90" [size]="15" [strokeWidth]="2.2" />
            </button>
            @for (item of items(); track $index) {
              @if (item === 'gap') {
                <span class="px-1 text-ink-faint" aria-hidden="true">…</span>
              } @else {
                <button
                  type="button"
                  class="pager-button tabular-nums"
                  [class.pager-current]="item === page()"
                  [attr.aria-current]="item === page() ? 'page' : null"
                  [attr.aria-label]="'Page ' + (item + 1)"
                  (click)="goTo(item)"
                >
                  {{ item + 1 }}
                </button>
              }
            }
            <button
              type="button"
              class="pager-button"
              aria-label="Page suivante"
              [disabled]="page() >= pageCount() - 1"
              (click)="goTo(page() + 1)"
            >
              <app-icon name="chevron-down" class="-rotate-90" [size]="15" [strokeWidth]="2.2" />
            </button>
          </span>
        }
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly total = input.required<number>();
  readonly pageSize = input(10);
  readonly page = model(0);

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly from = computed(() => this.page() * this.pageSize() + 1);
  protected readonly to = computed(() =>
    Math.min(this.total(), (this.page() + 1) * this.pageSize()),
  );

  protected readonly items = computed<PageItem[]>(() => {
    const count = this.pageCount();
    const current = this.page();
    const pages = [...new Set([0, count - 1, current - 1, current, current + 1])]
      .filter((page) => page >= 0 && page < count)
      .sort((a, b) => a - b);
    const items: PageItem[] = [];
    pages.forEach((page, index) => {
      if (index > 0 && page - pages[index - 1] > 1) {
        items.push('gap');
      }
      items.push(page);
    });
    return items;
  });

  protected goTo(page: number): void {
    this.page.set(Math.min(Math.max(page, 0), this.pageCount() - 1));
  }
}
