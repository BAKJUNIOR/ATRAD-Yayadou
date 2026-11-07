import { Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-form-field',
  imports: [IconComponent],
  host: { class: 'block min-w-0' },
  template: `
    <label class="form-label">
      {{ label() }}
      <ng-content />
      @if (error()) {
        <span class="form-error" role="alert">
          <app-icon name="info" class="me-1 align-[-2px]" [size]="12" [strokeWidth]="2.4" />{{
            error()
          }}
        </span>
      }
    </label>
  `,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly error = input('');
}
