import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { formatStamp, isoDateToFr } from '../../../../../core/utils/date.util';
import { initialsOf } from '../../../../../core/utils/text.util';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { fileSizeLabel } from '../../../../dossiers/domain/piece.rules';
import {
  ATTENTE_DOCS,
  isLocked,
  lockReason,
  nextStatuses,
} from '../../../../dossiers/domain/workflow';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';
import { PieceOpener } from '../../../../dossiers/presentation/piece-opener.service';
import { DelayTone, delayOf } from '../../../domain/portfolio';
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
  private readonly store = inject(TransmissionStore);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(Dialog);
  protected readonly context = inject(TraitementContext);
  protected readonly actions = inject(DossierActionsService);
  protected readonly pieceOpener = inject(PieceOpener);

  /** Référence du dossier, lue dans l'URL (`/traitement/dossiers/:ref`). */
  readonly ref = input.required<string>();

  protected readonly notAssigned = NOT_ASSIGNED;
  protected readonly priorityText = PRIORITY_TEXT;
  protected readonly delayText = DELAY_TEXT;
  protected readonly formatStamp = formatStamp;
  protected readonly initialsOf = initialsOf;

  protected readonly comment = signal('');
  /** Gestionnaire choisi dans la liste d'affectation ; `null` tant que rien n'est choisi. */
  private readonly pickedGest = signal<string | null>(null);

  protected readonly dossier = computed(
    () => this.context.entityDossiers().find((dossier) => dossier.ref === this.ref()) ?? null,
  );

  protected readonly view = computed(() => {
    const dossier = this.dossier();
    if (!dossier) {
      return null;
    }
    const next = nextStatuses(dossier);
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
        ? "Retourner faute de document(s) (vers l'Accueil)"
        : "Retourner pour non-éligibilité (vers l'Accueil)",
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

  protected onComment(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  protected onGest(event: Event): void {
    this.pickedGest.set((event.target as HTMLSelectElement).value);
  }

  protected publish(event: Event): void {
    event.preventDefault();
    const dossier = this.dossier();
    const text = this.comment().trim();
    if (!dossier || !text || isLocked(dossier)) {
      return;
    }
    this.store.addComment(dossier.id, this.context.user(), text);
    this.comment.set('');
    this.toast.success(`Commentaire ajouté au dossier ${dossier.ref}.`);
  }

  protected assign(): void {
    const dossier = this.dossier();
    const gestionnaire = this.pickedGest() ?? dossier?.gest ?? '';
    if (!dossier) {
      return;
    }
    if (!gestionnaire || gestionnaire === NOT_ASSIGNED) {
      this.toast.warning("Sélectionnez un gestionnaire avant d'affecter.");
      return;
    }
    this.report(this.store.assign(dossier.id, gestionnaire, this.context.user()));
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
      this.report(
        this.store.reassign(
          dossier.id,
          choice.gestionnaire,
          choice.motif,
          this.context.signature(),
        ),
      );
    }
  }

  /** Avant de quitter l'écran : un commentaire saisi mais non publié serait perdu. */
  canLeave(): boolean | Promise<boolean> {
    if (!this.comment().trim()) {
      return true;
    }
    return this.confirm.ask({
      title: 'Quitter sans enregistrer ?',
      tone: 'warning',
      text: "Un commentaire n'a pas été publié. Si vous quittez cet écran, cette saisie sera perdue.",
      okLabel: 'Quitter sans enregistrer',
      cancelLabel: 'Rester',
      danger: true,
    });
  }

  protected sizeLabel(size: number): string {
    return fileSizeLabel(size);
  }

  private report(result: { ok: boolean; message: string }): void {
    if (result.ok) {
      this.toast.success(result.message);
    } else {
      this.toast.warning(result.message);
    }
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
      `Dossier renvoyé vers l'Accueil le ${rejectedAt} — consultation seule. Motif : ${dossier.rejectReason || '—'}` +
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
