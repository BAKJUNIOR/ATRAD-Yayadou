import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { Entite, EntityCapability } from '../../../../dossiers/domain/datasets';
import {
  CAPABILITIES,
  EntiteDraft,
  NATURES,
  entiteByCode,
  entiteErrors,
  etatTypes,
} from '../../../../dossiers/domain/referentiel';
import { ReferentielStore } from '../../../../dossiers/infrastructure/store/referentiel.store';
import { AdministrationApi } from '../../../infrastructure/api/administration.api';

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
  private readonly api = inject(AdministrationApi);
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
      return {
        entite,
        editing,
        locked: !!draft && !editing,
        usage:
          [
            recep ? `Réceptrice de ${recep} type(s) d'état` : '',
            emet ? `Émettrice dans ${emet} type(s) d'état` : '',
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

  protected readonly saving = signal(false);

  /**
   * Enregistre l'entité dans l'API puis relit le référentiel. En modification, les réglages que l'écran ne montre
   * pas (entité parente, responsables, e-mail, mode de répartition...) sont relus et conservés.
   */
  protected async save(): Promise<void> {
    const draft = this.draft();
    if (!draft || !this.canSave() || this.saving()) {
      return;
    }
    const fields = {
      code: draft.code.trim().toUpperCase(),
      nom: draft.nom.trim(),
      nature: draft.nature || 'Service',
      peutEmettre: draft.emet,
      peutReceptionner: draft.recep,
      peutTraiter: draft.trait,
    };
    const id = draft.orig ? entiteByCode(draft.orig)?.id : undefined;
    this.saving.set(true);
    try {
      if (id) {
        const current = await firstValueFrom(this.api.entite(id));
        await firstValueFrom(this.api.modifierEntite(id, { ...current, ...fields }));
      } else {
        await firstValueFrom(
          this.api.creerEntite({
            ...fields,
            parentId: null,
            responsableId: null,
            adjointId: null,
            email: null,
            emailCopieRejet: null,
            ville: null,
            delaiTransitJours: null,
            modeRepartition: 'AUTOMATIQUE',
            actif: true,
          }),
        );
      }
      await this.referentiel.refresh();
    } catch {
      return;
    } finally {
      this.saving.set(false);
    }
    this.draft.set(null);
    this.toast.success(`Entité « ${fields.nom} » enregistrée.`);
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
