import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../../../../core/utils/api-error.util';
import { DialogHeadComponent } from '../../../../../shared/ui/dialog-head/dialog-head.component';
import { Utilisateur } from '../../../../auth/domain/entities/utilisateur.entity';
import { entites, labelOf } from '../../../../dossiers/domain/referentiel';
import {
  ApiFonction,
  ApiProfil,
  UtilisateurApi,
} from '../../../infrastructure/api/utilisateur.api';

export interface UtilisateurDialogData {
  /** Utilisateur à modifier ; absent pour une création. */
  utilisateur?: Utilisateur;
  profils: ApiProfil[];
  fonctions: ApiFonction[];
}

interface Saisie {
  matricule: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  motDePasse: string;
  entiteId: string;
  fonctionId: string;
  profils: string[];
}

/**
 * Création ou modification d'un utilisateur, enregistrée par l'API ; se ferme sur l'utilisateur à jour. Les refus
 * du serveur (matricule déjà pris, mot de passe trop faible...) s'affichent dans le dialogue.
 */
@Component({
  selector: 'app-utilisateur-dialog',
  imports: [DialogHeadComponent],
  host: { class: 'dialog-card w-[min(640px,calc(100vw-2rem))]' },
  templateUrl: './utilisateur-dialog.component.html',
})
export class UtilisateurDialogComponent {
  protected readonly dialogRef = inject<DialogRef<Utilisateur>>(DialogRef);
  protected readonly data = inject<UtilisateurDialogData>(DIALOG_DATA);
  private readonly api = inject(UtilisateurApi);

  protected readonly creation = !this.data.utilisateur;
  protected readonly entites = entites().map((entite) => ({
    id: entite.id ?? '',
    label: labelOf(entite),
  }));

  protected readonly saisie = signal<Saisie>(this.initial());
  protected readonly pending = signal(false);
  protected readonly serverError = signal('');
  private readonly submitted = signal(false);

  protected readonly errors = computed(() => {
    const s = this.saisie();
    const errors: Partial<Record<keyof Saisie, string>> = {};
    if (this.creation && !/^[A-Za-z0-9._-]{2,20}$/.test(s.matricule.trim())) {
      errors.matricule = '2 à 20 lettres, chiffres, points, tirets ou soulignés.';
    }
    if (!s.prenom.trim()) {
      errors.prenom = 'Le prénom est obligatoire.';
    }
    if (!s.nom.trim()) {
      errors.nom = 'Le nom est obligatoire.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) {
      errors.email = 'Adresse e-mail invalide.';
    }
    if (this.creation && s.motDePasse.length < 8) {
      errors.motDePasse = '8 caractères minimum, avec au moins une lettre et un chiffre.';
    }
    if (!s.entiteId) {
      errors.entiteId = "Choisissez l'entité de rattachement.";
    }
    if (!s.profils.length) {
      errors.profils = 'Cochez au moins un profil.';
    }
    return errors;
  });

  protected shown(key: keyof Saisie): string {
    return this.submitted() ? (this.errors()[key] ?? '') : '';
  }

  protected set(key: Exclude<keyof Saisie, 'profils'>, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.saisie.update((saisie) => ({ ...saisie, [key]: value }));
  }

  protected toggleProfil(code: string): void {
    this.saisie.update((saisie) => ({
      ...saisie,
      profils: saisie.profils.includes(code)
        ? saisie.profils.filter((candidate) => candidate !== code)
        : [...saisie.profils, code],
    }));
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.serverError.set('');
    if (Object.keys(this.errors()).length || this.pending()) {
      return;
    }
    this.pending.set(true);
    try {
      this.dialogRef.close(
        await (this.creation ? this.create() : this.update(this.data.utilisateur!)),
      );
    } catch (error) {
      this.serverError.set(apiErrorMessage(error));
    } finally {
      this.pending.set(false);
    }
  }

  private create(): Promise<Utilisateur> {
    const s = this.saisie();
    return firstValueFrom(
      this.api.creer({
        matricule: s.matricule.trim().toLowerCase(),
        prenom: s.prenom.trim(),
        nom: s.nom.trim(),
        email: s.email.trim(),
        telephone: s.telephone.trim() || null,
        motDePasse: s.motDePasse,
        entiteId: s.entiteId,
        fonctionId: s.fonctionId || null,
        profils: s.profils,
      }),
    );
  }

  /** Seules les parties modifiées sont envoyées : informations, profils, puis entité et fonction. */
  private async update(before: Utilisateur): Promise<Utilisateur> {
    const s = this.saisie();
    let after = await firstValueFrom(
      this.api.modifier(before.id, {
        prenom: s.prenom.trim(),
        nom: s.nom.trim(),
        email: s.email.trim(),
        telephone: s.telephone.trim() || null,
      }),
    );
    if ([...s.profils].sort().join() !== [...before.profils].sort().join()) {
      after = await firstValueFrom(this.api.modifierProfils(before.id, s.profils));
    }
    if (s.entiteId !== (before.entite?.id ?? '') || s.fonctionId !== this.fonctionIdOf(before)) {
      after = await firstValueFrom(
        this.api.changerEntite(before.id, s.entiteId, s.fonctionId || null),
      );
    }
    return after;
  }

  private initial(): Saisie {
    const u = this.data.utilisateur;
    return {
      matricule: u?.matricule ?? '',
      prenom: u?.prenom ?? '',
      nom: u?.nom ?? '',
      email: u?.email ?? '',
      telephone: u?.telephone ?? '',
      motDePasse: '',
      entiteId: u?.entite?.id ?? '',
      fonctionId: u ? this.fonctionIdOf(u) : '',
      profils: u ? [...u.profils] : [],
    };
  }

  private fonctionIdOf(utilisateur: Utilisateur): string {
    return this.data.fonctions.find((fonction) => fonction.code === utilisateur.fonction)?.id ?? '';
  }
}
