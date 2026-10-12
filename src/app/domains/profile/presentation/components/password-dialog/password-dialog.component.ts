import { DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { DialogHeadComponent } from '../../../../../shared/ui/dialog-head/dialog-head.component';
import { PASSWORD_MIN_LENGTH, PasswordChange, passwordErrors } from '../../../domain/profile.rules';

const FIELDS: { key: keyof PasswordChange; label: string; autocomplete: string }[] = [
  { key: 'current', label: 'Mot de passe actuel', autocomplete: 'current-password' },
  { key: 'next', label: 'Nouveau mot de passe', autocomplete: 'new-password' },
  { key: 'confirmation', label: 'Confirmer le nouveau mot de passe', autocomplete: 'new-password' },
];

/** Saisie d'un nouveau mot de passe ; se ferme sur `true` quand la saisie est valide. */
@Component({
  selector: 'app-password-dialog',
  imports: [DialogHeadComponent],
  host: { class: 'dialog-card w-[min(520px,calc(100vw-2rem))]' },
  template: `
    <app-dialog-head kind="warning" title="Changer le mot de passe" (closed)="dialogRef.close()">
      <p>{{ minLength }} caractères minimum, avec au moins une lettre et un chiffre.</p>
    </app-dialog-head>
    @for (field of fields; track field.key) {
      <label class="form-label gap-1.5 text-[12.5px]">
        {{ field.label }}
        <input
          type="password"
          class="form-control py-2.5"
          [autocomplete]="field.autocomplete"
          [value]="change()[field.key]"
          [attr.aria-invalid]="!!shownError(field.key)"
          (input)="set(field.key, $event)"
        />
        @if (shownError(field.key); as error) {
          <span class="form-error" role="alert">{{ error }}</span>
        }
      </label>
    }
    <div class="dialog-actions">
      <button type="button" class="dialog-cancel" (click)="dialogRef.close()">Annuler</button>
      <button type="button" class="dialog-confirm bg-brand hover:bg-brand-dark" (click)="submit()">
        Changer le mot de passe
      </button>
    </div>
  `,
})
export class PasswordDialogComponent {
  protected readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);

  protected readonly fields = FIELDS;
  protected readonly minLength = PASSWORD_MIN_LENGTH;

  protected readonly change = signal<PasswordChange>({ current: '', next: '', confirmation: '' });
  /** Les erreurs ne s'affichent qu'après une première tentative de validation. */
  private readonly submitted = signal(false);
  private readonly errors = computed(() => passwordErrors(this.change()));

  protected shownError(key: keyof PasswordChange): string {
    return this.submitted() ? (this.errors()[key] ?? '') : '';
  }

  protected set(key: keyof PasswordChange, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.change.update((change) => ({ ...change, [key]: value }));
  }

  protected submit(): void {
    this.submitted.set(true);
    if (!Object.keys(this.errors()).length) {
      this.dialogRef.close(true);
    }
  }
}
