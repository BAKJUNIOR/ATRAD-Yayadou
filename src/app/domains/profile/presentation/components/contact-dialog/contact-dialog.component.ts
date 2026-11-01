import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { DialogHeadComponent } from '../../../../../shared/ui/dialog-head/dialog-head.component';
import { Contact, emailError, phoneError } from '../../../domain/profile.rules';

/** Modification des coordonnées de l'utilisateur connecté. */
@Component({
  selector: 'app-contact-dialog',
  imports: [DialogHeadComponent],
  host: { class: 'dialog-card w-[min(520px,calc(100vw-2rem))]' },
  template: `
    <app-dialog-head kind="info" title="Modifier mes coordonnées" (closed)="dialogRef.close()">
      <p>
        Votre nom, votre rôle et votre rattachement sont gérés par l'administrateur : seules vos
        coordonnées sont modifiables ici.
      </p>
    </app-dialog-head>
    <label class="form-label gap-1.5 text-[12.5px]">
      Adresse e-mail
      <input
        type="email"
        class="form-control py-2.5"
        autocomplete="email"
        placeholder="prenom.nom@domaine.com"
        [value]="email()"
        [attr.aria-invalid]="!!emailIssue()"
        (input)="email.set(value($event))"
      />
      @if (emailIssue()) {
        <span class="form-error" role="alert">{{ emailIssue() }}</span>
      }
    </label>
    <label class="form-label gap-1.5 text-[12.5px]">
      Téléphone
      <input
        type="tel"
        class="form-control py-2.5"
        autocomplete="tel"
        placeholder="+225 07 00 00 00 00"
        [value]="phone()"
        [attr.aria-invalid]="!!phoneIssue()"
        (input)="phone.set(value($event))"
      />
      @if (phoneIssue()) {
        <span class="form-error" role="alert">{{ phoneIssue() }}</span>
      }
    </label>
    <div class="dialog-actions">
      <button type="button" class="dialog-cancel" (click)="dialogRef.close()">Annuler</button>
      <button
        type="button"
        class="dialog-confirm bg-brand hover:bg-brand-dark"
        [disabled]="invalid()"
        (click)="save()"
      >
        Enregistrer
      </button>
    </div>
  `,
})
export class ContactDialogComponent {
  private readonly data = inject<Contact>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<Contact>>(DialogRef);

  protected readonly email = signal(this.data.email);
  protected readonly phone = signal(this.data.phone);

  protected readonly emailIssue = computed(() => emailError(this.email()));
  protected readonly phoneIssue = computed(() => phoneError(this.phone()));
  protected readonly invalid = computed(() => !!this.emailIssue() || !!this.phoneIssue());

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected save(): void {
    if (!this.invalid()) {
      this.dialogRef.close({ email: this.email().trim(), phone: this.phone().trim() });
    }
  }
}
