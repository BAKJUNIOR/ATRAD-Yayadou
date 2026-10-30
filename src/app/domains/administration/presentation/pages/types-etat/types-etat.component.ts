import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { EtatType } from '../../../../dossiers/domain/datasets';
import {
  EtatTypeDraft,
  EtatTypeView,
  SaisieMode,
  circuit,
  circuitsMissing,
  entiteByCode,
  entityLabel,
  etatTypeErrors,
  etatTypes,
} from '../../../../dossiers/domain/referentiel';
import { ReferentielStore } from '../../../../dossiers/infrastructure/store/referentiel.store';
import { AdministrationApi } from '../../../infrastructure/api/administration.api';

const LOCK_TIP = "Terminez d'abord la modification en cours (Enregistrer ou Annuler).";

const SAISIE_MODES: readonly { id: SaisieMode; title: string; text: string; byDefault: boolean }[] =
  [
    {
      id: 'choix',
      title: "Choix du type d'état d'abord",
      text: "L'agent choisit d'abord le type d'état ; seuls ses types de dossier sont proposés. Un état = une destination.",
      byDefault: true,
    },
    {
      id: 'auto',
      title: 'Génération automatique des états',
      text: "L'agent saisit tous ses dossiers dans un seul brouillon ; à la validation, un état est créé par type d'état.",
      byDefault: false,
    },
  ];

/**
 * Administration : types d'état de transmission (entité réceptrice et entités émettrices
 * autorisées) et mode de saisie des entités émettrices.
 */
@Component({
  selector: 'app-types-etat',
  imports: [NgTemplateOutlet, IconComponent],
  templateUrl: './types-etat.component.html',
})
export class TypesEtatComponent {
  private readonly referentiel = inject(ReferentielStore);
  private readonly api = inject(AdministrationApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly lockTip = LOCK_TIP;
  protected readonly modes = SAISIE_MODES;
  protected readonly saisieMode = computed(() => this.referentiel.value().saisieMode);

  /** Type d'état en cours de saisie ; `orig` vaut `null` pour un nouveau type. */
  protected readonly draft = signal<EtatTypeDraft | null>(null);

  private readonly types = computed(() => {
    this.referentiel.value();
    return etatTypes();
  });

  protected readonly missing = computed(() => {
    this.referentiel.value();
    return circuitsMissing();
  });

  protected readonly errors = computed(() => {
    this.referentiel.value();
    const draft = this.draft();
    return draft ? etatTypeErrors(draft) : [];
  });

  protected readonly dirty = computed(() => {
    const draft = this.draft();
    if (!draft) {
      return false;
    }
    if (!draft.orig) {
      return !!(draft.nom || draft.recep);
    }
    const original = this.types().find((type) => type.id === draft.orig);
    const key = (type: Pick<EtatType, 'nom' | 'recep' | 'emet'>): string =>
      JSON.stringify([type.nom, type.recep, [...type.emet].sort()]);
    return !original || key(original) !== key(draft);
  });

  protected readonly canSave = computed(() => this.dirty() && !this.errors().length);
  protected readonly saveTip = computed(() =>
    !this.dirty() ? 'Aucune modification' : (this.errors()[0] ?? "Enregistrer ce type d'état"),
  );

  /** Options du formulaire : entités réceptrices et émettrices. */
  protected readonly recepOptions = computed(() =>
    this.referentiel
      .value()
      .entites.filter((entite) => entite.recep)
      .map((entite) => ({
        value: entite.code,
        label: `${entite.nom} (${entite.code})${entite.trait ? ' · réceptionne et traite' : ''}`,
      })),
  );
  protected readonly emetOptions = computed(() =>
    this.referentiel.value().entites.filter((entite) => entite.emet),
  );

  protected readonly recepHint = computed(() => {
    const recep = this.draft()?.recep;
    if (!recep) {
      return '';
    }
    return entiteByCode(recep)?.trait
      ? "Cette entité traite aussi : pas d'étape de dispatch pour ses propres dossiers."
      : 'Cette entité dispatche ensuite chaque dossier vers son entité de traitement.';
  });

  /** L'entité réceptrice ne change plus dès qu'un type de dossier est rattaché. */
  protected readonly recepLocked = computed(() => {
    const draft = this.draft();
    return !!draft?.orig && !!this.types().find((type) => type.id === draft.orig)?.dossiers.length;
  });

  protected readonly cards = computed(() => {
    const draft = this.draft();
    const entites = this.referentiel.value().entites;
    return this.types().map((type) => {
      const editing = draft?.orig === type.id;
      const traits = [
        ...new Set(type.dossiers.map((dossier) => circuit(dossier).trait).filter(Boolean)),
      ];
      const traitMissing = type.dossiers.filter((dossier) => !circuit(dossier).trait).length;
      return {
        type,
        editing,
        locked: !!draft && !editing,
        recepLabel: entityLabel(type.recep),
        recepTrait: !!entiteByCode(type.recep)?.trait,
        emetteurs: type.emet.map((code) => entites.find((e) => e.code === code)?.nom ?? code),
        traitements: traits.map((code) => ({
          label: entityLabel(code),
          role: code === type.recep ? 'réceptrice' : 'dispatch',
        })),
        traitMissing: traitMissing ? `${traitMissing} type(s) sans entité de traitement` : '',
      };
    });
  });

  protected attachedText(type: EtatTypeView | undefined): string {
    return type?.dossiers.length
      ? `${type.dossiers.length} type(s) : ${type.dossiers.join(', ')}`
      : 'Aucun type de dossier rattaché';
  }

  protected readonly draftType = computed(() =>
    this.types().find((type) => type.id === this.draft()?.orig),
  );

  // ----------------------------------------------------------- Mode de saisie

  protected async pickMode(id: SaisieMode): Promise<void> {
    if (id === this.saisieMode()) {
      return;
    }
    const mode = SAISIE_MODES.find((candidate) => candidate.id === id)!;
    try {
      await firstValueFrom(this.api.modifierModeSaisie(id === 'auto' ? 'AUTO' : 'CHOIX'));
      await this.referentiel.refresh();
    } catch {
      return;
    }
    this.toast.success(`Mode de saisie : « ${mode.title} » enregistré.`);
  }

  // ------------------------------------------------------------ Types d'état

  protected add(): void {
    if (!this.draft()) {
      const emet = this.referentiel
        .value()
        .entites.filter((entite) => entite.emet)
        .map((entite) => entite.code);
      this.draft.set({ orig: null, nom: '', recep: '', emet });
    }
  }

  protected edit(type: EtatTypeView): void {
    if (!this.draft()) {
      this.draft.set({ orig: type.id, nom: type.nom, recep: type.recep, emet: [...type.emet] });
    }
  }

  protected setNom(event: Event): void {
    const nom = (event.target as HTMLInputElement).value;
    this.draft.update((draft) => (draft ? { ...draft, nom } : draft));
  }

  protected setRecep(event: Event): void {
    const recep = (event.target as HTMLSelectElement).value;
    this.draft.update((draft) => (draft ? { ...draft, recep } : draft));
  }

  protected toggleEmet(code: string): void {
    this.draft.update((draft) =>
      draft
        ? {
            ...draft,
            emet: draft.emet.includes(code)
              ? draft.emet.filter((candidate) => candidate !== code)
              : [...draft.emet, code],
          }
        : draft,
    );
  }

  protected cancel(): void {
    this.draft.set(null);
  }

  protected async save(): Promise<void> {
    const draft = this.draft();
    if (!draft || !this.canSave()) {
      return;
    }
    const row: EtatType = {
      id: draft.orig ?? '',
      nom: draft.nom.trim(),
      recep: draft.recep,
      emet: [...draft.emet],
    };
    const attached = draft.orig ? (this.draftType()?.dossiers.length ?? 0) : 0;
    const confirmed = await this.confirm.ask({
      title: `Enregistrer le type d'état « ${row.nom} » ?`,
      text: `Réceptionné par ${entityLabel(row.recep)} · ${attached} type(s) de dossier rattaché(s)${attached ? '' : ' (aucun : à rattacher dans Routage & affectation)'} · ${row.emet.length} entité(s) émettrice(s). S'applique aux prochains états créés.`,
      okLabel: 'Enregistrer',
    });
    if (!confirmed) {
      return;
    }
    const body = {
      nom: row.nom,
      entiteReceptriceId: entiteByCode(row.recep)?.id ?? '',
      emettriceIds: row.emet
        .map((code) => entiteByCode(code)?.id)
        .filter((id): id is string => !!id),
    };
    try {
      await firstValueFrom(
        draft.orig ? this.api.modifierTypeEtat(draft.orig, body) : this.api.creerTypeEtat(body),
      );
      await this.referentiel.refresh();
    } catch {
      return;
    }
    this.draft.set(null);
    this.toast.success(`Type d'état « ${row.nom} » enregistré.`);
  }

  protected async goToCircuits(): Promise<void> {
    await this.router.navigate(['/administration/routage']);
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
      text: `Le type d'état « ${draft.nom || 'nouveau'} » a été modifié mais pas enregistré. Si vous quittez cet écran, cette saisie sera perdue.`,
      okLabel: 'Quitter sans enregistrer',
      cancelLabel: 'Rester',
      danger: true,
    });
  }
}
