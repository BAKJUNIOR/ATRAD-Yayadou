import { Component, computed, signal } from '@angular/core';
import { formatStamp } from '../../../../../core/utils/date.util';
import {
  AUDIT_CATEGORIES,
  AuditFilter,
  CATEGORY_TEXT,
  EMPTY_AUDIT_FILTER,
  auditEvents,
  filterAudit,
} from '../../../domain/audit';

/** Administration : qui a fait quoi, sur quel état ou dossier, et quand. */
@Component({
  selector: 'app-journal-audit',
  templateUrl: './journal-audit.component.html',
})
export class JournalAuditComponent {
  protected readonly categories = AUDIT_CATEGORIES;
  protected readonly categoryText = CATEGORY_TEXT;
  protected readonly formatStamp = formatStamp;

  protected readonly filter = signal<AuditFilter>(EMPTY_AUDIT_FILTER);

  /**
   * Événements de la piste d'audit : fournis par le module audit du backend, pas encore construit. Rien n'est
   * affiché d'ici là plutôt que des événements reconstitués dans le navigateur.
   */
  private readonly all = computed<ReturnType<typeof auditEvents>>(() => []);
  protected readonly users = computed(() =>
    [...new Set(this.all().map((event) => event.who))].sort(),
  );
  protected readonly rows = computed(() => filterAudit(this.all(), this.filter()));
  protected readonly hasFilter = computed(() =>
    Object.values(this.filter()).some((value) => value.trim()),
  );
  protected readonly countLabel = computed(() => {
    const count = this.rows().length;
    return `${count} événement${count > 1 ? 's' : ''}${this.hasFilter() ? ' (filtré)' : ''}`;
  });

  protected set(key: keyof AuditFilter, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.filter.update((filter) => ({ ...filter, [key]: value }));
  }

  protected reset(): void {
    this.filter.set(EMPTY_AUDIT_FILTER);
  }
}
