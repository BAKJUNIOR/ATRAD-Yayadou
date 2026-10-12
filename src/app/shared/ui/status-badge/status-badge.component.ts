import { Component, computed, input } from '@angular/core';
import { STATUS_KEYS, Status } from '../../models/status';

@Component({
  selector: 'app-status-badge',
  host: { class: 'status-badge', '[class]': 'modifier()' },
  template: `{{ label() || status() }}`,
})
export class StatusBadgeComponent {
  readonly status = input.required<Status>();
  /** Libellé abrégé ; par défaut, le statut lui-même. */
  readonly label = input('');

  protected readonly modifier = computed(() => `status-${STATUS_KEYS[this.status()]}`);
}
