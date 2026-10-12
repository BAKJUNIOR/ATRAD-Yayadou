import { Component, computed, input } from '@angular/core';
import { STATUS_KEYS, Status } from '../../models/status';

@Component({
  selector: 'app-status-badge',
  host: { class: 'status-badge', '[class]': 'modifier()' },
  template: `{{ status() }}`,
})
export class StatusBadgeComponent {
  readonly status = input.required<Status>();

  protected readonly modifier = computed(() => `status-${STATUS_KEYS[this.status()]}`);
}
