import { DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { initialsOf } from '../../../core/utils/text.util';

/** Fiche « Mon profil » de l'utilisateur connecté. */
@Component({
  selector: 'app-profile-dialog',
  host: {
    class:
      'flex w-[min(420px,calc(100vw-3rem))] animate-enter flex-col gap-4 rounded-[calc(var(--radius-brand)*1.6)] border border-line bg-card p-6 shadow-[0_24px_64px_-16px_rgba(14,22,34,0.45)]',
  },
  template: `
    @if (account(); as account) {
      <div class="flex items-center gap-3.5">
        <span
          class="flex size-12 flex-none items-center justify-center rounded-full bg-brand text-[16px] font-bold text-white"
          aria-hidden="true"
        >
          {{ initials() }}
        </span>
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="text-[16px] font-semibold text-ink">{{ account.name }}</span>
          <span class="text-[12.5px] text-ink-muted">{{ account.roleLabel }}</span>
        </span>
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
    <div class="flex justify-end">
      <button
        type="button"
        class="rounded-control bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-dark"
        (click)="dialogRef.close()"
      >
        Fermer
      </button>
    </div>
  `,
})
export class ProfileDialogComponent {
  protected readonly dialogRef = inject<DialogRef<void>>(DialogRef);
  protected readonly account = inject(SessionService).account;

  protected readonly initials = computed(() => initialsOf(this.account()?.name ?? ''));
  protected readonly rows = computed(() => {
    const account = this.account();
    return account
      ? [
          { label: 'Identifiant', value: account.ident },
          { label: 'Rôle', value: account.roleLabel },
          { label: 'Entité', value: account.entity },
          { label: 'Organisation', value: 'YAYADOU' },
        ]
      : [];
  });
}
