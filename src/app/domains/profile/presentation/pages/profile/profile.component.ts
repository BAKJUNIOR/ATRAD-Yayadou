import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NAVIGATION } from '../../../../../core/navigation/navigation';
import { BrandService } from '../../../../../core/services/brand.service';
import { SessionService } from '../../../../../core/services/session.service';
import { Theme, ThemeService } from '../../../../../core/services/theme.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { entityCode, initialsOf } from '../../../../../core/utils/text.util';
import { IconComponent, IconName } from '../../../../../shared/ui/icon/icon.component';
import { Utilisateur } from '../../../../auth/domain/entities/utilisateur.entity';
import { TraitementContext } from '../../../../traitement/presentation/traitement-context.service';
import { Contact, jobTitle, splitName } from '../../../domain/profile.rules';
import { ProfileApi } from '../../../infrastructure/api/profile.api';
import { ContactDialogComponent } from '../../components/contact-dialog/contact-dialog.component';
import { PasswordDialogComponent } from '../../components/password-dialog/password-dialog.component';

interface Field {
  label: string;
  value: string;
  /** Valeur absente : affichée en retrait. */
  empty?: boolean;
  mono?: boolean;
}

const THEMES: { id: Theme; label: string; icon: IconName }[] = [
  { id: 'light', label: 'Clair', icon: 'sun' },
  { id: 'dark', label: 'Sombre', icon: 'moon' },
];

function field(label: string, value: string, mono = false): Field {
  return value ? { label, value, mono } : { label, value: 'Non renseigné', empty: true };
}

/** Profil de l'utilisateur connecté : identité, rattachement, sécurité et apparence. */
@Component({
  selector: 'app-profile',
  imports: [IconComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private readonly session = inject(SessionService);
  private readonly brand = inject(BrandService);
  private readonly api = inject(ProfileApi);
  private readonly traitement = inject(TraitementContext);
  private readonly dialog = inject(Dialog);
  private readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);

  protected readonly themes = THEMES;
  protected readonly account = this.session.account;

  protected readonly initials = computed(() => initialsOf(this.account()?.name ?? ''));
  protected readonly jobTitle = computed(() => jobTitle(this.account()?.roleLabel ?? ''));
  /** Compte lu dans l'API (`/moi`). */
  private readonly utilisateur = signal<Utilisateur | null>(null);
  private readonly contact = computed<Contact>(() => ({
    email: this.utilisateur()?.email ?? '',
    phone: this.utilisateur()?.telephone ?? '',
  }));

  constructor() {
    this.api.moi().subscribe((utilisateur) => this.utilisateur.set(utilisateur));
  }

  protected readonly identity = computed<Field[]>(() => {
    const account = this.account();
    if (!account) {
      return [];
    }
    const utilisateur = this.utilisateur();
    const { firstName, lastName } = utilisateur
      ? { firstName: utilisateur.prenom, lastName: utilisateur.nom }
      : splitName(account.name);
    const contact = this.contact();
    return [
      field('Prénom', firstName),
      field('Nom de famille', lastName),
      field('Identifiant', account.ident, true),
      field('Adresse e-mail', contact.email),
      field('Téléphone', contact.phone),
      field('Fonction', this.jobTitle()),
    ];
  });

  protected readonly attachment = computed<Field[]>(() => {
    const account = this.account();
    if (!account) {
      return [];
    }
    const fields = [
      ...(this.brand.org() ? [field('Organisation', this.brand.org())] : []),
      field('Agence / entité', account.entity.replace(/ \(.*\)$/, '')),
      field('Code', entityCode(account.entity), true),
      field('Parcours', NAVIGATION[account.role].title),
    ];
    // Profil traitement : mode de répartition de l'entité et droits de l'agent, lus dans l'API.
    if (account.role === 'traitement') {
      const functions = this.traitement.functions();
      const rights = [
        functions.traiter && 'Traiter',
        functions.pool && "S'attribuer",
        functions.affecter && 'Affecter',
        functions.rechercher && 'Rechercher',
      ].filter((right): right is string => !!right);
      fields.push(field('Répartition des dossiers', this.traitement.modeLabel()));
      fields.push(field('Mes droits', rights.length ? rights.join(' · ') : "Hors de l'équipe"));
    }
    return fields;
  });

  protected async editContact(): Promise<void> {
    const account = this.account();
    if (!account) {
      return;
    }
    const ref = this.dialog.open<Contact, Contact>(ContactDialogComponent, {
      data: this.contact(),
      ariaLabel: 'Modifier mes coordonnées',
      backdropClass: 'app-dialog-backdrop',
    });
    const contact = await firstValueFrom(ref.closed);
    if (contact) {
      this.api.modifierCoordonnees(contact.email, contact.phone).subscribe((utilisateur) => {
        this.utilisateur.set(utilisateur);
        this.toast.success('Coordonnées enregistrées.');
      });
    }
  }

  protected async changePassword(): Promise<void> {
    const ref = this.dialog.open<boolean>(PasswordDialogComponent, {
      ariaLabel: 'Changer le mot de passe',
      backdropClass: 'app-dialog-backdrop',
    });
    if (await firstValueFrom(ref.closed)) {
      this.toast.success('Mot de passe changé.');
    }
  }

  protected signOut(): void {
    void this.session.signOutAndLeave();
  }
}
