import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../../../core/services/toast.service';
import { formatStamp, isoDateToFr } from '../../../../../core/utils/date.util';
import { initialsOf } from '../../../../../core/utils/text.util';
import { Status } from '../../../../../shared/models/status';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { RoutedDossier } from '../../../../dossiers/domain/entities/dossier.entity';
import { fileSizeLabel } from '../../../../dossiers/domain/piece.rules';
import {
  ATTENTE_DOCS,
  DossierActionKind,
  isLocked,
  lockReason,
  nextStatuses,
} from '../../../../dossiers/domain/workflow';
import { PieceOpener } from '../../../../dossiers/presentation/piece-opener.service';
import { DelayTone, delayOf } from '../../../domain/portfolio';
import { DossierFiche, TraitementStore } from '../../../infrastructure/store/traitement.store';
import {
  ReassignChoice,
  ReassignDialogComponent,
  ReassignDialogData,
} from '../../components/reassign-dialog/reassign-dialog.component';
import { DossierActionsService } from '../../dossier-actions.service';
import { TraitementContext } from '../../traitement-context.service';

const NOT_ASSIGNED = 'Non affecté';

const DELAY_TEXT: Record<DelayTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success',
  muted: 'text-ink-muted',
};

const PRIORITY_TEXT: Record<Priorite, string> = {
  Normale: 'text-ink-muted',
  Haute: 'text-warning',
  Urgente: 'text-danger',
};

/** Parcours traitement : instruire un dossier, l'affecter et lui appliquer une action. */
@Component({
  selector: 'app-dossier-detail',
  imports: [RouterLink, StatusBadgeComponent],
  templateUrl: './dossier-detail.component.html',
})
export class DossierDetailComponent {
  private readonly store = inject(TraitementStore);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(Dialog);
  protected readonly context = inject(TraitementContext);
  protected readonly actions = inject(DossierActionsService);
  protected readonly pieceOpener = inject(PieceOpener);

  /** Identifiant du dossier, lu dans l'URL (`/traitement/dossiers/:id`). */
  readonly id = input.required<string>();

  protected readonly notAssigned = NOT_ASSIGNED;
  protected readonly priorityText = PRIORITY_TEXT;
  protected readonly delayText = DELAY_TEXT;
  protected readonly formatStamp = formatStamp;
  protected readonly initialsOf = initialsOf;

  /** Gestionnaire choisi dans la liste d'affectation ; `null` tant que rien n'est choisi. */
  private readonly pickedGest = signal<string | null>(null);

  /** Fiche lue dans l'API, avec les passages du circuit que l'utilisateur peut faire. */
  private readonly fiche = signal<DossierFiche | null>(null);
  protected readonly loaded = signal(false);
  protected readonly dossier = computed(() => this.fiche()?.dossier ?? null);

  constructor() {
    effect(() => void this.load(this.id()));
  }

  private async load(id: string): Promise<void> {
    try {
      this.fiche.set(await this.store.fiche(id));
    } catch {
      this.fiche.set(null);
    } finally {
      this.loaded.set(true);
    }
  }

  /** Applique une action du circuit puis relit la fiche. */
  protected async run(
    dossier: RoutedDossier,
    kind: DossierActionKind,
    target?: Status,
  ): Promise<void> {
    if (await this.actions.run(dossier, kind, target)) {
      await this.load(dossier.id);
    }
  }

  protected readonly view = computed(() => {
    const dossier = this.dossier();
    if (!dossier) {
      return null;
    }
    // L'API ne propose d'actions qu'au gestionnaire en charge du dossier.
    const next = this.fiche()?.actions.length ? nextStatuses(dossier) : [];
    const locked = isLocked(dossier);
    const canValidate = next.includes('Validé');
    const canClose = next.includes('Clôturé');
    const waitingDocs = dossier.status === ATTENTE_DOCS;
    const delay = delayOf(dossier, this.context.today);
    const reason = lockReason(dossier);

    let hint: string;
    if (next.length && !canValidate && !canClose) {
      hint = `Choisissez le statut suivant autorisé par le circuit « ${dossier.type} ».`;
    } else if (canValidate) {
      hint =
        "Après instruction, validez le dossier. La clôture ne sera possible qu'une fois le dossier validé.";
    } else if (canClose) {
      hint = 'Dossier validé : vous pouvez maintenant le clôturer définitivement.';
    } else if (locked) {
      hint = `Dossier ${dossier.status.toLowerCase()} — consultation seule, aucune action de traitement possible.`;
    } else {
      hint = `Dossier ${dossier.status.toLowerCase()} — aucune action de traitement disponible.`;
    }

    return {
      locked,
      canValidate,
      canClose,
      waitingDocs,
      delay,
      hint,
      echeance: isoDateToFr(dossier.echeanceIso),
      summary: [dossier.type, dossier.produit, dossier.montant || '—', `n° ${dossier.num}`].join(
        ' · ',
      ),
      circuit:
        `Circuit « ${dossier.type} » · statut actuel : ${dossier.status}` +
        (next.length ? ` · suivants autorisés : ${next.join(', ')}` : ' · aucun statut suivant'),
      statusTransitions: this.actions
        .transitions(dossier)
        .filter((transition) => transition.kind === 'statut'),
      canReturn: next.includes('Dossier retourné'),
      canRequestDocs: next.includes(ATTENTE_DOCS),
      notAllowedTip: `Non autorisé par le circuit « ${dossier.type} » depuis le statut « ${dossier.status} »`,
      returnLabel: waitingDocs
        ? "Retourner faute de document(s) (vers l'entité réceptrice)"
        : "Retourner pour non-éligibilité (vers l'entité réceptrice)",
      validateTip: canValidate ? null : `Action impossible : ${reason}`,
      closeTip: canClose
        ? null
        : dossier.status === 'Clôturé'
          ? 'Déjà clôturé'
          : locked
            ? `Action impossible : ${reason}`
            : "Validez d'abord le dossier",
      lockedMessage: this.lockedMessage(),
      docsMessage: this.docsMessage(delay.docsLate === true),
      canReassign: dossier.status === 'En cours' && !!dossier.gest,
      reassignTip: !dossier.gest
        ? "Aucun gestionnaire : utilisez l'affectation"
        : 'Réaffectation possible uniquement pour un dossier En cours',
      pickedGest: this.pickedGest() ?? (dossier.gest || NOT_ASSIGNED),
    };
  });

  protected onGest(event: Event): void {
    this.pickedGest.set((event.target as HTMLSelectElement).value);
  }

  protected async assign(): Promise<void> {
    const dossier = this.dossier();
    const gestionnaire = this.pickedGest() ?? dossier?.gest ?? '';
    if (!dossier) {
      return;
    }
    if (!gestionnaire || gestionnaire === NOT_ASSIGNED) {
      this.toast.warning("Sélectionnez un gestionnaire avant d'affecter.");
      return;
    }
    await this.attribute(
      dossier,
      gestionnaire,
      `Dossier ${dossier.ref} affecté à ${gestionnaire}.`,
    );
    this.pickedGest.set(null);
  }

  protected async reassign(): Promise<void> {
    const dossier = this.dossier();
    if (!dossier?.gest || dossier.status !== 'En cours') {
      return;
    }
    const ref = this.dialog.open<ReassignChoice, ReassignDialogData>(ReassignDialogComponent, {
      data: {
        ref: dossier.ref,
        current: dossier.gest,
        options: this.context.team().filter((member) => member !== dossier.gest),
      },
      ariaLabel: `Réaffecter ${dossier.ref}`,
      backdropClass: 'app-dialog-backdrop',
    });
    const choice = await firstValueFrom(ref.closed);
    if (choice) {
      await this.attribute(
        dossier,
        choice.gestionnaire,
        `Dossier ${dossier.ref} réaffecté à ${choice.gestionnaire}.`,
        choice.motif,
      );
    }
  }

  private async attribute(
    dossier: RoutedDossier,
    gestionnaire: string,
    message: string,
    motif?: string,
  ): Promise<void> {
    try {
      await this.store.assign(dossier.id, gestionnaire, motif);
    } catch {
      return;
    }
    this.toast.success(message);
    await this.load(dossier.id);
  }

  protected sizeLabel(size: number): string {
    return fileSizeLabel(size);
  }

  private lockedMessage(): string {
    const dossier = this.dossier();
    if (!dossier) {
      return '';
    }
    const by = dossier.closedBy ? ` par ${dossier.closedBy}` : '';
    const at = dossier.closedAt ? formatStamp(dossier.closedAt) : '—';
    if (dossier.status === 'Traité') {
      return `Dossier traité le ${at}${by} — statut final, consultation seule.`;
    }
    if (dossier.status === 'Clôturé') {
      return `Dossier clôturé le ${at}${by} — consultation seule, aucune modification possible.`;
    }
    const rejectedAt = dossier.rejectedAt ? formatStamp(dossier.rejectedAt) : '—';
    return (
      `Dossier renvoyé vers l'entité réceptrice le ${rejectedAt} — consultation seule. Motif : ${dossier.rejectReason || '—'}` +
      (dossier.complements ? ` · Compléments attendus : ${dossier.complements}` : '')
    );
  }

  private docsMessage(late: boolean): string {
    const dossier = this.dossier();
    if (!dossier) {
      return '';
    }
    const expected = (dossier.docsMissing ?? []).join(', ') || dossier.complements || '—';
    return (
      `Document(s) attendu(s) : ${expected} · demandé le ${dossier.docsReqAt ? formatStamp(dossier.docsReqAt) : '—'}` +
      (dossier.docsDeadlineIso
        ? ` · à fournir avant le ${isoDateToFr(dossier.docsDeadlineIso)}`
        : '') +
      (dossier.docsNote ? ` · remarque : ${dossier.docsNote}` : '') +
      (late
        ? ". DÉLAI DÉPASSÉ : si le document n'est pas arrivé, passez le dossier en « Dossier retourné » (Actions → Retourner le dossier à l'agence)"
        : '') +
      '. Validez le dossier une fois le complément obtenu.'
    );
  }
}
