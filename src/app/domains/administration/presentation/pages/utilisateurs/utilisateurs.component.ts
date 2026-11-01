import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import { PaginationResponse } from '../../../../../core/models/pagination.model';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { SessionService } from '../../../../../core/services/session.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { formatStamp } from '../../../../../core/utils/date.util';
import { Utilisateur } from '../../../../auth/domain/entities/utilisateur.entity';
import { entites, labelOf } from '../../../../dossiers/domain/referentiel';
import { UtilisateurApi } from '../../../infrastructure/api/utilisateur.api';
import {
  UtilisateurDialogComponent,
  UtilisateurDialogData,
} from '../../components/utilisateur-dialog/utilisateur-dialog.component';

const TAILLE = 15;

/** Administration : comptes des utilisateurs (recherche, création, modification, activation). */
@Component({
  selector: 'app-utilisateurs',
  templateUrl: './utilisateurs.component.html',
})
export class UtilisateursComponent {
  private readonly api = inject(UtilisateurApi);
  private readonly dialog = inject(Dialog);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);

  protected readonly formatStamp = formatStamp;

  /** Profils et fonctions proposés à la saisie. */
  private readonly references = toSignal(
    forkJoin({ profils: this.api.profils(), fonctions: this.api.fonctions() }).pipe(
      catchError(() => of({ profils: [], fonctions: [] })),
    ),
    { initialValue: { profils: [], fonctions: [] } },
  );
  protected readonly profils = computed(() => this.references().profils);
  protected readonly entites = computed(() =>
    entites().map((entite) => ({ id: entite.id ?? '', label: labelOf(entite) })),
  );

  protected readonly recherche = signal('');
  protected readonly entiteId = signal('');
  protected readonly profil = signal('');
  protected readonly page = signal(0);

  protected readonly result = signal<PaginationResponse<Utilisateur> | null>(null);
  protected readonly rows = computed(() => this.result()?.content ?? []);
  protected readonly pageLabel = computed(() => {
    const result = this.result();
    return result ? `Page ${result.currentPage + 1} sur ${Math.max(1, result.totalPages)}` : '';
  });
  protected readonly countLabel = computed(() => {
    const total = this.result()?.totalElements ?? 0;
    return `${total} utilisateur${total > 1 ? 's' : ''}`;
  });

  constructor() {
    effect(() => {
      const criteres = {
        recherche: this.recherche().trim(),
        entiteId: this.entiteId(),
        profil: this.profil(),
        page: this.page(),
        taille: TAILLE,
      };
      untracked(() => this.load(criteres));
    });
  }

  protected onRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
    this.page.set(0);
  }

  protected onEntite(event: Event): void {
    this.entiteId.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
  }

  protected onProfil(event: Event): void {
    this.profil.set((event.target as HTMLSelectElement).value);
    this.page.set(0);
  }

  protected goTo(page: number): void {
    const total = this.result()?.totalPages ?? 1;
    if (page >= 0 && page < total) {
      this.page.set(page);
    }
  }

  protected profilLabel(code: string): string {
    return this.profils().find((profil) => profil.code === code)?.nom ?? code;
  }

  protected isMe(utilisateur: Utilisateur): boolean {
    return utilisateur.id === this.session.account()?.id;
  }

  protected async open(utilisateur?: Utilisateur): Promise<void> {
    const ref = this.dialog.open<Utilisateur, UtilisateurDialogData>(UtilisateurDialogComponent, {
      data: { utilisateur, ...this.references() },
      ariaLabel: utilisateur
        ? `Modifier ${utilisateur.prenom} ${utilisateur.nom}`
        : 'Nouvel utilisateur',
      backdropClass: 'app-dialog-backdrop',
    });
    const saved = await firstValueFrom(ref.closed);
    if (saved) {
      this.toast.success(
        utilisateur
          ? `Utilisateur ${saved.prenom} ${saved.nom} enregistré.`
          : `Utilisateur ${saved.matricule} créé.`,
      );
      this.reload();
    }
  }

  protected async toggleActif(utilisateur: Utilisateur): Promise<void> {
    const actif = !utilisateur.actif;
    const confirmed = await this.confirm.ask({
      title: `${actif ? 'Réactiver' : 'Désactiver'} ${utilisateur.prenom} ${utilisateur.nom} ?`,
      text: actif
        ? "L'utilisateur pourra de nouveau se connecter."
        : "L'utilisateur ne pourra plus se connecter ; ses dossiers et son historique sont conservés.",
      okLabel: actif ? 'Réactiver' : 'Désactiver',
      danger: !actif,
    });
    if (!confirmed) {
      return;
    }
    try {
      await firstValueFrom(this.api.modifierStatut(utilisateur.id, actif));
    } catch {
      return;
    }
    this.toast.success(
      `${utilisateur.prenom} ${utilisateur.nom} ${actif ? 'réactivé' : 'désactivé'}.`,
    );
    this.reload();
  }

  private reload(): void {
    this.load({
      recherche: this.recherche().trim(),
      entiteId: this.entiteId(),
      profil: this.profil(),
      page: this.page(),
      taille: TAILLE,
    });
  }

  private load(criteres: {
    recherche: string;
    entiteId: string;
    profil: string;
    page: number;
    taille: number;
  }): void {
    this.api.rechercher(criteres).subscribe({
      next: (result) => this.result.set(result),
      error: () => this.result.set(null),
    });
  }
}
