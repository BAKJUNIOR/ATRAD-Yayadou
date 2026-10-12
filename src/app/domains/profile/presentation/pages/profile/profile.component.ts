import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NAVIGATION } from '../../../../../core/navigation/navigation';
import { BrandService } from '../../../../../core/services/brand.service';
import { SessionService } from '../../../../../core/services/session.service';
import { Theme, ThemeService } from '../../../../../core/services/theme.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { entityCode, initialsOf } from '../../../../../core/utils/text.util';
import { IconComponent, IconName } from '../../../../../shared/ui/icon/icon.component';
import { MODE_LABEL, rightsOf } from '../../../../dossiers/domain/routing';
import { RoutingStore } from '../../../../dossiers/infrastructure/store/routing.store';
import { Contact, jobTitle, splitName } from '../../../domain/profile.rules';
import { ProfileStore } from '../../../infrastructure/store/profile.store';
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
  private readonly profiles = inject(ProfileStore);
  private readonly routing = inject(RoutingStore);
  private readonly dialog = inject(Dialog);
  private readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);

  protected readonly themes = THEMES;
  protected readonly account = this.session.account;

  protected readonly initials = computed(() => initialsOf(this.account()?.name ?? ''));
  protected readonly jobTitle = computed(() => jobTitle(this.account()?.roleLabel ?? ''));
  private readonly contact = computed<Contact>(() =>
    this.profiles.contactOf(this.account()?.ident ?? ''),
  );

  protected readonly identity = computed<Field[]>(() => {
    const account = this.account();
    if (!account) {
      return [];
    }
    const { firstName, lastName } = splitName(account.name);
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
      field('Organisation', this.brand.org()),
      field('Agence / entité', account.entity.replace(/ \(.*\)$/, '')),
      field('Code', entityCode(account.entity), true),
      field('Parcours', NAVIGATION[account.role].title),
    ];
    // Profil traitement : mode de répartition de l'entité et droits de l'agent dans celle-ci.
    const settings = this.routing.config().ent[account.entity];
    if (account.role === 'traitement' && settings) {
      fields.push(field('Répartition des dossiers', MODE_LABEL[settings.mode]));
      fields.push(
        field(
          'Mes droits',
          settings.team.includes(account.name)
            ? rightsOf(account.name, settings).join(' · ')
            : "Hors de l'équipe",
        ),
      );
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
      this.profiles.saveContact(account.ident, contact);
      this.toast.success('Coordonnées enregistrées.');
    }
  }

  protected async changePassword(): Promise<void> {
    const ref = this.dialog.open<boolean>(PasswordDialogComponent, {
      ariaLabel: 'Changer le mot de passe',
      backdropClass: 'app-dialog-backdrop',
    });
    if (await firstValueFrom(ref.closed)) {
      // Aucun mot de passe n'est vérifié tant que l'API d'authentification n'est pas branchée.
      this.toast.info("Démonstration : le changement sera appliqué une fois l'API branchée.");
    }
  }

  protected signOut(): void {
    void this.session.signOutAndLeave();
  }
}
