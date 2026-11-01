import { Dialog } from '@angular/cdk/dialog';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { Status } from '../../../shared/models/status';
import { IconName } from '../../../shared/ui/icon/icon.component';
import { RoutedDossier } from '../../dossiers/domain/entities/dossier.entity';
import {
  ATTENTE_DOCS,
  DossierAction,
  DossierActionKind,
  STATUS_ACTIONS,
  nextStatuses,
} from '../../dossiers/domain/workflow';

import {
  ActionDialogComponent,
  ActionDialogData,
} from './components/action-dialog/action-dialog.component';
import { TraitementStore } from '../infrastructure/store/traitement.store';

/** Transition proposée dans un menu d'actions. */
export interface TransitionOption {
  target: Status;
  kind: DossierActionKind;
  label: string;
  icon: IconName;
  /** Couleur de l'icône, selon la nature du statut visé. */
  iconClass: string;
  danger: boolean;
}

const TRANSITION_ICONS: Partial<Record<Status, IconName>> = {
  Validé: 'check',
  Clôturé: 'archive',
  [ATTENTE_DOCS]: 'file',
  'Dossier retourné': 'return',
  'En cours': 'arrow-right',
  Projeté: 'pencil',
  Traité: 'check-circle',
};

const TRANSITION_ICON_CLASSES: Partial<Record<Status, string>> = {
  Validé: 'text-success',
  Clôturé: 'text-ink-muted',
  [ATTENTE_DOCS]: 'text-warning',
  'Dossier retourné': 'text-danger',
  'En cours': 'text-info',
  Projeté: 'text-info',
  Traité: 'text-success',
};

/** Ouvre la confirmation d'une action de traitement puis l'applique au dossier. */
@Service()
export class DossierActionsService {
  private readonly dialog = inject(Dialog);
  private readonly store = inject(TraitementStore);
  private readonly toast = inject(ToastService);

  /** Transitions autorisées par le circuit du dossier, prêtes à afficher. */
  transitions(dossier: RoutedDossier): TransitionOption[] {
    const waitingDocs = dossier.status === ATTENTE_DOCS;
    return nextStatuses(dossier).flatMap((target) => {
      const action = STATUS_ACTIONS[target];
      if (!action) {
        return [];
      }
      let label = action.label;
      if (waitingDocs && target === 'Dossier retourné') {
        label = "Retourner le dossier à l'agence";
      } else if (waitingDocs && target === 'En cours') {
        label = 'Documents reçus — reprendre le traitement';
      }
      return [
        {
          target,
          kind: action.kind,
          label,
          icon: TRANSITION_ICONS[target] ?? 'plus',
          iconClass: TRANSITION_ICON_CLASSES[target] ?? 'text-ink-muted',
          danger: target === 'Dossier retourné',
        },
      ];
    });
  }

  /** Ouvre la confirmation puis applique l'action par l'API ; rend `true` si elle a été appliquée. */
  async run(dossier: RoutedDossier, kind: DossierActionKind, target?: Status): Promise<boolean> {
    // Un dossier en attente de documents se retourne faute de documents, pas pour non-éligibilité.
    const effective: DossierActionKind =
      kind === 'retour_noneligible' && dossier.status === ATTENTE_DOCS ? 'retour_docs' : kind;
    const ref = this.dialog.open<DossierAction, ActionDialogData>(ActionDialogComponent, {
      data: { dossier, kind: effective, target },
      ariaLabel: `Action sur le dossier ${dossier.ref}`,
      backdropClass: 'app-dialog-backdrop',
    });
    const action = await firstValueFrom(ref.closed);
    if (!action) {
      return false;
    }
    try {
      this.toast.success(await this.store.act(dossier, action));
      return true;
    } catch {
      // Refus de l'API : déjà affiché par l'intercepteur.
      return false;
    }
  }
}
