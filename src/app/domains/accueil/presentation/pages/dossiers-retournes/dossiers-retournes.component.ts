import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { formatStamp } from '../../../../../core/utils/date.util';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { ApiDossier, routedFromApi } from '../../../../dossiers/domain/entities/dossier-api.entity';
import { RoutedDossier } from '../../../../dossiers/domain/entities/dossier.entity';
import { ENTITES, bareEntity } from '../../../../dossiers/domain/routing';
import { pendingReturns } from '../../../domain/reception';
import { AccueilApi, ApiDossierRetourne } from '../../../infrastructure/api/accueil.api';

/** Parcours accueil : renvoyer à leur agence les dossiers retournés par une entité. */
@Component({
  selector: 'app-dossiers-retournes',
  imports: [IconComponent],
  templateUrl: './dossiers-retournes.component.html',
})
export class DossiersRetournesComponent {
  private readonly api = inject(AccueilApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly formatStamp = formatStamp;
  protected readonly bareEntity = bareEntity;

  private readonly pickedEntite = signal('');
  private readonly pickedAgence = signal('');
  protected readonly query = signal('');
  private readonly picked = signal<ReadonlySet<string>>(new Set());

  /** Dossiers retournés par les services traitants, pas encore renvoyés à leur agence (lus dans l'API). */
  protected readonly pending = signal<RoutedDossier[]>([]);

  constructor() {
    this.load();
  }

  private load(): void {
    this.api
      .retours()
      .subscribe((retours) => this.pending.set(pendingReturns(retours.map(retourneFromApi))));
  }

  /** Entités ayant au moins un dossier à renvoyer, avec leur nombre. */
  protected readonly entiteOptions = computed(() =>
    ENTITES.map((entite) => ({
      value: entite.name,
      label: bareEntity(entite.name),
      count: this.pending().filter((dossier) => dossier.entite === entite.name).length,
    })).filter((option) => option.count > 0),
  );
  protected readonly entite = computed(() =>
    this.entiteOptions().some((option) => option.value === this.pickedEntite())
      ? this.pickedEntite()
      : '',
  );
  private readonly ofEntite = computed(() =>
    this.pending().filter((dossier) => !this.entite() || dossier.entite === this.entite()),
  );
  protected readonly agenceOptions = computed(() =>
    [...new Set(this.ofEntite().map((dossier) => dossier.agence))].sort(),
  );
  protected readonly agence = computed(() =>
    this.agenceOptions().includes(this.pickedAgence()) ? this.pickedAgence() : '',
  );

  /** Dossiers affichés, du plus récemment retourné au plus ancien. */
  protected readonly rows = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.ofEntite()
      .filter((dossier) => !this.agence() || dossier.agence === this.agence())
      .filter(
        (dossier) =>
          !query ||
          [dossier.ref, dossier.client, dossier.type, dossier.num]
            .join(' ')
            .toLowerCase()
            .includes(query),
      )
      .reverse();
  });
  private readonly pickedRows = computed(() =>
    this.rows().filter((dossier) => this.picked().has(dossier.id)),
  );
  protected readonly pickedCount = computed(() => this.pickedRows().length);
  protected readonly allPicked = computed(
    () => this.rows().length > 0 && this.pickedCount() === this.rows().length,
  );
  protected readonly hasFilter = computed(() => !!this.agence() || !!this.query().trim());
  protected readonly pendingLabel = computed(() =>
    this.pending().length
      ? `${this.pending().length} dossier(s) à renvoyer`
      : 'Aucun dossier en attente',
  );
  protected readonly emptyMessage = computed(() =>
    this.pending().length
      ? 'Aucun dossier ne correspond à ces filtres.'
      : 'Aucun dossier à renvoyer aux agences',
  );

  protected isPicked(id: string): boolean {
    return this.picked().has(id);
  }

  // Changer de filtre vide la sélection : elle ne doit porter que sur des dossiers visibles.
  protected onEntite(event: Event): void {
    this.pickedEntite.set((event.target as HTMLSelectElement).value);
    this.picked.set(new Set());
  }

  protected onAgence(event: Event): void {
    this.pickedAgence.set((event.target as HTMLSelectElement).value);
    this.picked.set(new Set());
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.picked.set(new Set());
  }

  protected clearFilters(): void {
    this.pickedAgence.set('');
    this.query.set('');
    this.picked.set(new Set());
  }

  protected toggle(id: string): void {
    this.picked.update((picked) => {
      const next = new Set(picked);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  protected toggleAll(): void {
    this.picked.set(
      this.allPicked() ? new Set() : new Set(this.rows().map((dossier) => dossier.id)),
    );
  }

  protected async confirmReturn(): Promise<void> {
    const picked = this.pickedRows();
    if (!picked.length) {
      return;
    }
    const refs = picked.map((dossier) => dossier.ref).join(', ');
    const agences = [...new Set(picked.map((dossier) => dossier.agence))].join(', ');
    const confirmed = await this.confirm.ask({
      title: 'Confirmer le retour en agence ?',
      text: `${picked.length} dossier(s) placé(s) dans le courrier : ${refs}. Agence(s) destinataire(s) : ${agences}. Ils passeront au statut « Retourné en agence » et l'agence d'origine sera notifiée. Opération horodatée et définitive.`,
      okLabel: 'Confirmer le retour en agence',
    });
    if (!confirmed) {
      return;
    }
    let returned: ApiDossier[];
    try {
      returned = await firstValueFrom(this.api.renvoyer(picked.map((dossier) => dossier.id)));
    } catch {
      return;
    }
    this.picked.set(new Set());
    this.toast.success(
      `${returned.length} dossier(s) retourné(s) en agence : ${returned.map((dossier) => dossier.reference).join(', ')}.`,
    );
    this.load();
  }
}

/** Dossier retourné de l'API, vu comme un dossier routé (motif, pièces manquantes, date du retour). */
function retourneFromApi(row: ApiDossierRetourne): RoutedDossier {
  return routedFromApi({
    dossier: row.dossier,
    actions: [],
    suspens: row.piecesManquantes.length
      ? {
          id: '',
          piecesManquantes: row.piecesManquantes,
          note: null,
          demandeParId: '',
          demandeLe: '',
          dateLimite: null,
          regulariseLe: null,
        }
      : null,
    retour: row.retour,
    pieces: [],
    historique: [],
  });
}
