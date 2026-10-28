import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { demoAccounts } from '../../../../auth/infrastructure/mock/auth.mock';
import { Entite, EntityCapability } from '../../../../dossiers/domain/datasets';
import {
  CAPABILITIES,
  EntiteDraft,
  NATURES,
  entiteErrors,
  entityCode,
  etatTypes,
} from '../../../../dossiers/domain/referentiel';
import { ReferentielStore } from '../../../../dossiers/infrastructure/store/referentiel.store';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';

const LOCK_TIP = "Terminez d'abord la modification en cours (Enregistrer ou Annuler).";

const EDITABLE: readonly (keyof Entite)[] = ['nom', 'nature', 'emet', 'recep', 'trait'];

/**
 * Administration : entités et leurs capacités (émettre, réceptionner, traiter). La nature
 * (« Agence », « Service »…) n'est qu'un libellé d'affichage.
 */
@Component({
  selector: 'app-entites',
  imports: [NgTemplateOutlet, IconComponent],
  templateUrl: './entites.component.html',
})
export class EntitesComponent {
  private readonly referentiel = inject(ReferentielStore);
  private readonly store = inject(TransmissionStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly natures = NATURES;
  protected readonly capabilities = CAPABILITIES;
  protected readonly lockTip = LOCK_TIP;

  /** Fiche en cours de saisie ; `orig` vaut `null` pour une nouvelle entité. */
  protected readonly draft = signal<EntiteDraft | null>(null);

  private readonly entites = computed(() => this.referentiel.value().entites);

  protected readonly errors = computed(() => {
    this.referentiel.value();
    const draft = this.draft();
    return draft ? entiteErrors(draft) : [];
  });

  protected readonly dirty = computed(() => {
    const draft = this.draft();
    if (!draft) {
      return false;
    }
    if (!draft.orig) {
      return !!(draft.code || draft.nom);
    }
    const original = this.entites().find((entite) => entite.code === draft.orig);
    return !original || EDITABLE.some((key) => original[key] !== draft[key]);
  });

  protected readonly canSave = computed(() => this.dirty() && !this.errors().length);
  protected readonly saveTip = computed(() =>
    !this.dirty() ? 'Aucune modification' : (this.errors()[0] ?? 'Enregistrer cette entité'),
  );

  protected readonly summary = computed(() => {
    const entites = this.entites();
    const count = (key: EntityCapability): number => entites.filter((e) => e[key]).length;
    return `${entites.length} entité(s) · ${count('emet')} émettrice(s) · ${count('recep')} réceptrice(s) · ${count('trait')} de traitement`;
  });

  protected readonly rows = computed(() => {
    this.referentiel.value();
    const draft = this.draft();
    const types = etatTypes();
    return this.entites().map((entite) => {
      const editing = draft?.orig === entite.code;
      const recep = types.filter((type) => type.recep === entite.code).length;
      const emet = types.filter((type) => type.emet.includes(entite.code)).length;
      const accounts = demoAccounts()
        .filter((account) => entityCode(account.entity) === entite.code)
        .map((account) => account.name);
      return {
        entite,
        editing,
        locked: !!draft && !editing,
        usage:
          [
            recep ? `Réceptrice de ${recep} type(s) d'état` : '',
            emet ? `Émettrice dans ${emet} type(s) d'état` : '',
            accounts.length ? `Compte(s) : ${accounts.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(' · ') || "Aucun type d'état ni compte rattaché",
        chips: CAPABILITIES.filter((capability) => entite[capability.key]).map((c) => c.chip),
      };
    });
  });

  protected add(): void {
    if (!this.draft()) {
      this.draft.set({
        orig: null,
        code: '',
        nom: '',
        nature: 'Service',
        emet: false,
        recep: false,
        trait: false,
      });
    }
  }

  protected edit(entite: Entite): void {
    if (!this.draft()) {
      this.draft.set({ orig: entite.code, ...entite });
    }
  }

  protected setText(key: 'code' | 'nom' | 'nature', event: Event): void {
    const raw = (event.target as HTMLInputElement | HTMLSelectElement).value;
    const value = key === 'code' ? raw.toUpperCase() : raw;
    this.draft.update((draft) => (draft ? { ...draft, [key]: value } : draft));
  }

  protected toggle(key: EntityCapability): void {
    this.draft.update((draft) => (draft ? { ...draft, [key]: !draft[key] } : draft));
  }

  protected cancel(): void {
    this.draft.set(null);
  }

  protected save(): void {
    const draft = this.draft();
    if (!draft || !this.canSave()) {
      return;
    }
    const row: Entite = {
      code: draft.code.trim().toUpperCase(),
      nom: draft.nom.trim(),
      nature: draft.nature || 'Service',
      emet: draft.emet,
      recep: draft.recep,
      trait: draft.trait,
    };
    const entites = this.entites();
    this.referentiel.save({
      entites: draft.orig
        ? entites.map((entite) => (entite.code === draft.orig ? row : entite))
        : [...entites, row],
    });
    // Un renommage se répercute sur les dossiers déjà routés vers l'entité.
    this.store.normalizeEntities();
    this.draft.set(null);
    this.toast.success(`Entité « ${row.nom} » enregistrée.`);
  }

  /** Appelé par le garde de sortie de la route. */
  async canLeave(): Promise<boolean> {
    const draft = this.draft();
    if (!draft || !this.dirty()) {
      return true;
    }
    return this.confirm.ask({
      title: 'Quitter sans enregistrer ?',
      tone: 'warning',
      text: `La fiche de l'entité ${draft.nom || 'en cours'} a été modifiée mais pas enregistrée. Si vous quittez cet écran, cette saisie sera perdue.`,
      okLabel: 'Quitter sans enregistrer',
      cancelLabel: 'Rester',
      danger: true,
    });
  }
}
