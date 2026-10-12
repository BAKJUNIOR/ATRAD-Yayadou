import { Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Libellé, contrôle projeté et message d'erreur.
 * Le contrôle est placé dans le `<label>` : il lui est donc associé sans `for` / `id`.
 */
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
  /** Libellé complet, avec son éventuel ` *` ou ` (facultatif)`. */
  readonly label = input.required<string>();
  readonly error = input('');
}
