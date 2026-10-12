import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NAVIGATION } from '../../../../../core/navigation/navigation';
import { SessionService } from '../../../../../core/services/session.service';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { StatCardComponent } from '../../../../../shared/ui/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { DASHBOARD_MOCK } from '../../../infrastructure/mock/dashboard.mock';

const LIFECYCLE = [
  { title: 'Agence', description: "Crée les dossiers et constitue l'état de transmission." },
  {
    title: 'Accueil / entité centrale',
    description:
      'Confirme la réception ; chaque dossier est routé automatiquement vers son entité.',
  },
  { title: 'Entité de traitement', description: 'Instruit, valide puis clôture le dossier.' },
  { title: 'Pilotage', description: 'Suit les KPI, les délais et la charge par entité.' },
];

/** Accueil commun à tous les profils : son contenu dépend du rôle connecté. */
@Component({
  selector: 'app-home',
  imports: [RouterLink, ButtonComponent, IconComponent, StatCardComponent, StatusBadgeComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly session = inject(SessionService);

  protected readonly lifecycle = LIFECYCLE;

  protected readonly dashboard = computed(() => {
    const role = this.session.role();
    return role ? DASHBOARD_MOCK[role] : null;
  });

  protected readonly primaryPath = computed(() => {
    const role = this.session.role();
    return role ? NAVIGATION[role].primaryPath : '/';
  });
}
