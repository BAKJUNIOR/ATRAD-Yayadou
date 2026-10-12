import { DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject } from '@angular/core';
import { BrandService } from '../../../core/services/brand.service';
import { SessionService } from '../../../core/services/session.service';
import { IconComponent } from '../icon/icon.component';
import { initialsOf } from '../../../core/utils/text.util';

/** Fiche « Mon profil » de l'utilisateur connecté. */
@Component({
  selector: 'app-profile-dialog',
  imports: [IconComponent],
  host: {
    class: 'dialog-card w-[min(460px,calc(100vw-2rem))]',
  },
  template: `
    <button
      type="button"
      class="absolute end-4 top-4 flex size-10 items-center justify-center rounded-full bg-soft text-ink-muted transition-colors hover:bg-line hover:text-ink"
      aria-label="Fermer"
      title="Fermer"
      (click)="dialogRef.close()"
    >
      <app-icon name="close" [size]="18" [strokeWidth]="2" />
    </button>
    @if (account(); as account) {
      <div class="flex flex-col items-center gap-1 text-center">
        <span
          class="mb-2 flex size-[72px] items-center justify-center rounded-full bg-brand text-[24px] font-bold text-white"
          aria-hidden="true"
        >
          {{ initials() }}
        </span>
        <h2 class="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-ink">
          {{ account.name }}
        </h2>
        <span class="text-[13.5px] text-ink-muted">{{ account.roleLabel }}</span>
      </div>
      <dl
        class="flex flex-col gap-[9px] rounded-brand border border-line bg-subtle px-3.5 py-3 text-[13px]"
      >
        @for (row of rows(); track row.label) {
          <div class="flex justify-between gap-3">
            <dt class="whitespace-nowrap text-ink-muted">{{ row.label }}</dt>
            <dd class="min-w-0 text-end text-ink">{{ row.value }}</dd>
          </div>
        }
      </dl>
    }
    <div class="dialog-actions">
      <button
        type="button"
        class="dialog-confirm bg-brand hover:bg-brand-dark"
        (click)="dialogRef.close()"
      >
        Fermer
      </button>
    </div>
  `,
})
export class ProfileDialogComponent {
  protected readonly dialogRef = inject<DialogRef<void>>(DialogRef);
  private readonly brand = inject(BrandService);
  protected readonly account = inject(SessionService).account;

  protected readonly initials = computed(() => initialsOf(this.account()?.name ?? ''));
  protected readonly rows = computed(() => {
    const account = this.account();
    return account
      ? [
          { label: 'Identifiant', value: account.ident },
          { label: 'Rôle', value: account.roleLabel },
          { label: 'Entité', value: account.entity },
          { label: 'Organisation', value: this.brand.org() },
        ]
      : [];
  });
}
