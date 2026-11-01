import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { DOSSIER_TYPES, DossierType } from '../../../../dossiers/domain/dossier-catalog';
import {
  Circuit,
  circuit,
  circuitsMissing,
  entiteByCode,
  entityCode,
  entityLabel,
  newDossierTypeError,
  traitEntites,
} from '../../../../dossiers/domain/referentiel';
import {
  AssignmentMode,
  ENTITES,
  EntitySettings,
  MODES,
  entitySettings,
  rightsOf,
  shortEntity,
} from '../../../../dossiers/domain/routing';
import { ReferentielStore } from '../../../../dossiers/infrastructure/store/referentiel.store';
import { AdministrationApi } from '../../../infrastructure/api/administration.api';
import { RoutingStore } from '../../../infrastructure/store/routing.store';

type Tab = 'map' | 'rep';

const LOCK_TIP = "Terminez d'abord la modification en cours (Enregistrer ou Annuler).";

/** Circuit en cours de saisie : type d'état et entité de traitement (codes). */
interface CircuitDraft {
  et: string;
  trait: string;
}

function modeLabel(mode: AssignmentMode): string {
  return MODES.find((candidate) => candidate.id === mode)?.label ?? mode;
}

/** Erreur de paramétrage d'une entité en mode répartiteur sans répartiteur désigné. */
function dispatcherError(settings: EntitySettings): string {
  return settings.mode === 'disp' && !settings.dispatchers.length
    ? 'Mode « Via un répartiteur » : désignez au moins une personne dans « Qui répartit ? ».'
    : '';
}

/** Garde les listes dérivées de l'équipe cohérentes avec elle, dans l'ordre du référentiel. */
function normalise(settings: EntitySettings, all: readonly string[]): EntitySettings {
  const team = all.filter((member) => settings.team.includes(member));
  return {
    ...settings,
    team,
    dispatchers: team.filter((member) => settings.dispatchers.includes(member)),
    searchers: team.filter((member) => settings.searchers.includes(member)),
  };
}

/**
 * Administration : circuit de chaque type de dossier (type d'état et entité de traitement), et
 * répartition interne de chaque entité.
 */
@Component({
  selector: 'app-routage',
  imports: [IconComponent],
  templateUrl: './routage.component.html',
})
export class RoutageComponent {
  private readonly routing = inject(RoutingStore);
  private readonly referentiel = inject(ReferentielStore);
  private readonly api = inject(AdministrationApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly entites = ENTITES;
  protected readonly modes = MODES;
  protected readonly modeLabel = modeLabel;

  protected readonly lockTip = LOCK_TIP;
  protected readonly tab = signal<Tab>('map');
  /** Circuit en cours de modification. */
  protected readonly mapEdit = signal<({ type: DossierType } & CircuitDraft) | null>(null);
  /** Type de dossier en cours d'ajout. */
  protected readonly newType = signal<({ nom: string } & CircuitDraft) | null>(null);
  private readonly selectedEntite = signal(ENTITES[0]?.name ?? '');
  /** Réglages modifiés de l'entité affichée, tant qu'ils ne sont pas enregistrés. */
  private readonly entDraft = signal<EntitySettings | null>(null);

  private readonly saved = this.routing.config;

  constructor() {
    // Équipes, répartiteurs et membres candidats, lus dans l'API.
    void this.routing.load().catch(() => undefined);
  }

  // ------------------------------------------------ Circuit des types de dossier

  /** Options : types d'état (avec leur réceptrice) et entités de traitement. */
  protected readonly etatTypeOptions = computed(() => [
    { value: '', label: '— Aucun (à rattacher) —' },
    ...this.referentiel.value().etatTypes.map((etatType) => ({
      value: etatType.id,
      label: `${etatType.nom} · ${entityLabel(etatType.recep)}`,
    })),
  ]);
  protected readonly traitOptions = computed(() => {
    this.referentiel.value();
    return [
      { value: '', label: "— Choisir l'entité de traitement —" },
      ...traitEntites().map((entite) => ({
        value: entite.code,
        label: `${entite.nom} (${entite.code})`,
      })),
    ];
  });

  protected readonly missing = computed(() => {
    this.referentiel.value();
    return circuitsMissing();
  });

  /** Une saisie est en cours : les autres lignes et l'ajout sont verrouillés. */
  protected readonly busy = computed(() => !!this.mapEdit() || !!this.newType());

  protected readonly typeRows = computed(() => {
    const ref = this.referentiel.value();
    this.saved();
    const edit = this.mapEdit();
    const busy = this.busy();
    return ref.dossierTypes.map((type) => {
      const saved = circuit(type);
      const editing = edit?.type === type;
      const etatType = ref.etatTypes.find((candidate) => candidate.id === saved.et);
      const used = this.typeUse(type);
      const locked = busy && !editing;
      const deleteBlocked = locked || !!used || ref.dossierTypes.length <= 1;
      return {
        type,
        editing,
        locked,
        check: saved.check,
        toAttach: !saved.et,
        etLabel: etatType?.nom ?? 'Aucun',
        etSub: etatType ? `Réceptionné par ${entityLabel(etatType.recep)}` : '',
        traitLabel: saved.trait ? entityLabel(saved.trait) : 'Non définie',
        hasTrait: !!saved.trait,
        changed: editing && (edit.et !== saved.et || edit.trait !== saved.trait || saved.check),
        error: editing ? this.circuitError(edit) : '',
        editTip: locked ? LOCK_TIP : `Modifier « ${type} »`,
        deleteBlocked,
        deleteTip: locked
          ? LOCK_TIP
          : used
            ? `Suppression impossible : ${used}`
            : ref.dossierTypes.length <= 1
              ? 'Il faut au moins un type de dossier'
              : `Supprimer « ${type} »`,
      };
    });
  });

  /** L'API refuse elle-même de supprimer un type déjà utilisé, avec son message. */
  private typeUse(_type: DossierType): string {
    return '';
  }

  private circuitError(draft: CircuitDraft): string {
    if (!draft.trait) {
      return "Choisissez l'entité de traitement.";
    }
    if (!entiteByCode(draft.trait)?.trait) {
      return "Cette entité n'a pas la capacité « Traite ».";
    }
    const label = entityLabel(draft.trait);
    const settings = entitySettings(label);
    return settings && !settings.team.length
      ? `${shortEntity(label)} n'a aucun gestionnaire : complétez d'abord son équipe dans l'onglet « Répartition interne par entité ».`
      : '';
  }

  /** Choisir un type d'état dont la réceptrice traite propose celle-ci comme entité de traitement. */
  private withEtatType(draft: CircuitDraft, et: string): CircuitDraft {
    const etatType = this.referentiel.value().etatTypes.find((candidate) => candidate.id === et);
    const recep = etatType ? entiteByCode(etatType.recep) : undefined;
    return { et, trait: recep?.trait ? recep.code : draft.trait };
  }

  protected startMapEdit(type: DossierType): void {
    if (!this.busy()) {
      const { et, trait } = circuit(type);
      this.mapEdit.set({ type, et, trait });
    }
  }

  protected onMapEtatType(event: Event): void {
    const et = (event.target as HTMLSelectElement).value;
    this.mapEdit.update((edit) => (edit ? { ...edit, ...this.withEtatType(edit, et) } : edit));
  }

  protected onMapTrait(event: Event): void {
    const trait = (event.target as HTMLSelectElement).value;
    this.mapEdit.update((edit) => (edit ? { ...edit, trait } : edit));
  }

  protected async saveMapEdit(): Promise<void> {
    const edit = this.mapEdit();
    if (!edit || this.circuitError(edit)) {
      return;
    }
    const before = circuit(edit.type);
    const etName = (id: string): string =>
      this.referentiel.value().etatTypes.find((candidate) => candidate.id === id)?.nom ?? 'aucun';
    const confirmed = await this.confirm.ask({
      title: `Modifier le circuit de « ${edit.type} » ?`,
      text: `Type d'état : ${etName(before.et)} → ${etName(edit.et)} · Entité de traitement : ${before.trait ? entityLabel(before.trait) : 'non définie'} → ${entityLabel(edit.trait)}. Seule cette ligne est modifiée. S'applique aux prochaines réceptions ; les dossiers déjà routés ne bougent pas.`,
      okLabel: 'Enregistrer',
    });
    if (!confirmed) {
      return;
    }
    try {
      await firstValueFrom(
        this.api.modifierCircuit(
          this.referentiel.value().typeIds[edit.type] ?? '',
          edit.et,
          entiteByCode(edit.trait)?.id ?? null,
        ),
      );
      await this.referentiel.refresh();
    } catch {
      return;
    }
    this.mapEdit.set(null);
    this.toast.success(`Circuit de « ${edit.type} » enregistré.`);
  }

  // --- Ajout et suppression d'un type de dossier

  protected readonly newTypeError = computed(() => {
    const draft = this.newType();
    return draft ? newDossierTypeError(draft.nom, draft.trait) : '';
  });

  protected startNewType(): void {
    if (!this.busy()) {
      this.newType.set({ nom: '', et: '', trait: '' });
    }
  }

  protected onNewTypeName(event: Event): void {
    const nom = (event.target as HTMLInputElement).value;
    this.newType.update((draft) => (draft ? { ...draft, nom } : draft));
  }

  protected onNewTypeEtatType(event: Event): void {
    const et = (event.target as HTMLSelectElement).value;
    this.newType.update((draft) => (draft ? { ...draft, ...this.withEtatType(draft, et) } : draft));
  }

  protected onNewTypeTrait(event: Event): void {
    const trait = (event.target as HTMLSelectElement).value;
    this.newType.update((draft) => (draft ? { ...draft, trait } : draft));
  }

  protected async saveNewType(): Promise<void> {
    const draft = this.newType();
    if (!draft || this.newTypeError()) {
      return;
    }
    const nom = draft.nom.trim();
    const etatType = this.referentiel
      .value()
      .etatTypes.find((candidate) => candidate.id === draft.et);
    const confirmed = await this.confirm.ask({
      title: `Ajouter le type de dossier « ${nom} » ?`,
      text: `${etatType ? `Type d'état : ${etatType.nom} · ` : "Sans type d'état (à rattacher) · "}traité par ${entityLabel(draft.trait)}.`,
      okLabel: 'Ajouter',
    });
    if (!confirmed) {
      return;
    }
    try {
      await firstValueFrom(
        this.api.creerTypeDossier(nom, draft.et, entiteByCode(draft.trait)?.id ?? null),
      );
      await this.referentiel.refresh();
    } catch {
      return;
    }
    this.newType.set(null);
    this.toast.success(`Type de dossier « ${nom} » ajouté.`);
  }

  protected async deleteType(type: DossierType): Promise<void> {
    const row = this.typeRows().find((candidate) => candidate.type === type);
    if (!row || row.deleteBlocked) {
      return;
    }
    const confirmed = await this.confirm.ask({
      title: `Supprimer le type de dossier « ${type} » ?`,
      text: "Il sera retiré de la liste, de son type d'état et du routage. Aucun dossier n'utilise ce type. Action définitive.",
      okLabel: 'Supprimer',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await firstValueFrom(
        this.api.supprimerTypeDossier(this.referentiel.value().typeIds[type] ?? ''),
      );
      await this.referentiel.refresh();
    } catch {
      return;
    }
    this.toast.success(`Type de dossier « ${type} » supprimé.`);
  }

  // ------------------------------------------- Répartition interne par entité

  protected readonly entite = this.selectedEntite.asReadonly();
  private readonly settings = computed(
    () => this.entDraft() ?? this.savedSettings(this.selectedEntite()),
  );
  protected readonly dirty = computed(() => {
    const draft = this.entDraft();
    return (
      !!draft && JSON.stringify(draft) !== JSON.stringify(this.savedSettings(this.selectedEntite()))
    );
  });

  /** Réglages enregistrés d'une entité (libellé complet). */
  private savedSettings(name: string): EntitySettings {
    this.saved();
    return entitySettings(name) ?? { mode: 'auto', team: [], dispatchers: [], searchers: [] };
  }

  /** Types de dossier dont le circuit aboutit à l'entité. */
  private typesOf(name: string): DossierType[] {
    this.referentiel.value();
    return DOSSIER_TYPES.filter((type) => circuit(type).trait === entityCode(name));
  }

  protected readonly entityList = computed(() =>
    ENTITES.map((entite) => {
      const selected = entite.name === this.selectedEntite();
      const settings = selected ? this.settings() : this.savedSettings(entite.name);
      const types = this.typesOf(entite.name);
      let note = '';
      let noteClass = 'text-ink-faint';
      if (dispatcherError(settings)) {
        note = 'Aucun répartiteur désigné';
        noteClass = 'text-danger';
      } else if (!settings.team.length && types.length) {
        note = 'Équipe vide';
        noteClass = 'text-danger';
      } else if (selected && this.dirty()) {
        note = 'Modifications non enregistrées';
        noteClass = 'text-warning';
      } else if (!types.length) {
        note = 'Aucun type rattaché';
      }
      return {
        name: entite.name,
        short: entite.short,
        code: entityCode(entite.name),
        mode: modeLabel(settings.mode),
        team: `${settings.team.length} membre${settings.team.length > 1 ? 's' : ''}`,
        selected,
        note,
        noteClass,
      };
    }),
  );

  protected readonly detail = computed(() => {
    const settings = this.settings();
    const isDisp = settings.mode === 'disp';
    const error = !settings.team.length
      ? "Équipe vide : cochez au moins un membre dans « Équipe de l'entité »."
      : dispatcherError(settings);
    return {
      settings,
      isDisp,
      error: this.dirty() || isDisp ? error : '',
      types: this.typesOf(this.selectedEntite()),
      teamLabel: `${settings.team.length} membre${settings.team.length > 1 ? 's' : ''} sur ${this.routing.gestionnaires().length}`,
      dispatcherCount: settings.dispatchers.length
        ? `${settings.dispatchers.length} désigné${settings.dispatchers.length > 1 ? 's' : ''}`
        : 'obligatoire',
      gridClass: isDisp ? 'members-grid-disp min-w-[480px]' : 'members-grid min-w-[380px]',
      members: this.routing.gestionnaires().map((name) => {
        const inTeam = settings.team.includes(name);
        return {
          name,
          inTeam,
          dispatcher: settings.dispatchers.includes(name),
          searcher: settings.searchers.includes(name),
          rights: inTeam ? rightsOf(name, settings) : [],
        };
      }),
    };
  });

  protected async selectEntite(name: string): Promise<void> {
    if (name !== this.selectedEntite() && (await this.confirmDiscard())) {
      this.selectedEntite.set(name);
      this.entDraft.set(null);
    }
  }

  protected setMode(mode: AssignmentMode): void {
    this.edit((settings) => ({ ...settings, mode }));
  }

  protected toggleMember(name: string): void {
    this.edit((settings) => ({ ...settings, team: this.flip(settings.team, name) }));
  }

  protected toggleDispatcher(name: string): void {
    this.edit((settings) => ({ ...settings, dispatchers: this.flip(settings.dispatchers, name) }));
  }

  protected toggleSearcher(name: string): void {
    this.edit((settings) => ({ ...settings, searchers: this.flip(settings.searchers, name) }));
  }

  protected cancelEntEdit(): void {
    this.entDraft.set(null);
  }

  protected async saveEntEdit(): Promise<void> {
    const draft = this.entDraft();
    const name = this.selectedEntite();
    if (!draft || !this.dirty() || this.detail().error) {
      return;
    }
    const before = this.savedSettings(name);
    const changes: string[] = [];
    if (before.mode !== draft.mode) {
      changes.push(`mode : ${modeLabel(before.mode)} → ${modeLabel(draft.mode)}`);
    }
    const added = draft.team.filter((member) => !before.team.includes(member));
    const removed = before.team.filter((member) => !draft.team.includes(member));
    if (added.length) {
      changes.push(`ajout à l'équipe : ${added.join(', ')}`);
    }
    if (removed.length) {
      changes.push(`retrait de l'équipe : ${removed.join(', ')}`);
    }
    if (draft.mode === 'disp' && before.dispatchers.join() !== draft.dispatchers.join()) {
      changes.push(`répartiteur(s) : ${draft.dispatchers.join(', ')}`);
    }
    const canSearch = draft.searchers.filter((member) => !before.searchers.includes(member));
    const noSearch = before.searchers.filter(
      (member) => !draft.searchers.includes(member) && draft.team.includes(member),
    );
    if (canSearch.length) {
      changes.push(`peut rechercher : ${canSearch.join(', ')}`);
    }
    if (noSearch.length) {
      changes.push(`ne peut plus rechercher : ${noSearch.join(', ')}`);
    }
    const rights = draft.team
      .map(
        (member) =>
          `${member} : ${rightsOf(member, draft).join(' · ')}${draft.searchers.includes(member) ? ' + Rechercher' : ''}`,
      )
      .join(' ; ');

    const confirmed = await this.confirm.ask({
      title: `Enregistrer « ${shortEntity(name)} » ?`,
      text:
        `Changements : ${changes.join(' ; ') || '—'}. Droits appliqués : ${rights}.` +
        (removed.length ? ` ${removed.join(', ')} perd(ent) ses droits dans cette entité.` : '') +
        ' Seule cette entité est modifiée.',
      okLabel: 'Enregistrer',
    });
    if (!confirmed) {
      return;
    }
    try {
      await this.routing.save(entityCode(name), draft);
    } catch {
      return;
    }
    this.entDraft.set(null);
    this.toast.success(`Répartition de ${shortEntity(name)} enregistrée.`);
  }

  // ----------------------------------------------------- Onglets et sortie

  protected async pickTab(tab: Tab): Promise<void> {
    if (tab !== this.tab() && (await this.confirmDiscard())) {
      this.tab.set(tab);
      this.mapEdit.set(null);
      this.newType.set(null);
      this.entDraft.set(null);
    }
  }

  /** Appelé par le garde de sortie de la route. */
  canLeave(): Promise<boolean> {
    return this.confirmDiscard();
  }

  private hasUnsaved(): boolean {
    const edit = this.mapEdit();
    const saved = edit ? circuit(edit.type) : null;
    const newType = this.newType();
    return (
      this.dirty() ||
      (!!edit && !!saved && (edit.et !== saved.et || edit.trait !== saved.trait)) ||
      (!!newType && !!newType.nom.trim())
    );
  }

  private async confirmDiscard(): Promise<boolean> {
    if (!this.hasUnsaved()) {
      return true;
    }
    return this.confirm.ask({
      title: 'Quitter sans enregistrer ?',
      tone: 'warning',
      text: 'Le paramétrage du routage a été modifié mais pas enregistré. Si vous quittez cet écran, cette saisie sera perdue.',
      okLabel: 'Quitter sans enregistrer',
      cancelLabel: 'Rester',
      danger: true,
    });
  }

  private edit(change: (settings: EntitySettings) => EntitySettings): void {
    this.entDraft.set(
      normalise(change(structuredClone(this.settings())), this.routing.gestionnaires()),
    );
  }

  private flip(list: readonly string[], name: string): string[] {
    return list.includes(name) ? list.filter((member) => member !== name) : [...list, name];
  }
}
