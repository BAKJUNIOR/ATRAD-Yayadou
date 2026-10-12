import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NAVIGATION } from '../../core/navigation/navigation';
import { APP_NAME, PageTitleStrategy } from '../../core/services/page-title.strategy';
import { SessionService } from '../../core/services/session.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, IconComponent, ThemeToggleComponent],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  private readonly session = inject(SessionService);
  protected readonly sidebar = inject(SidebarService);

  protected readonly appName = APP_NAME;
  protected readonly pageTitle = inject(PageTitleStrategy).pageTitle;

  protected readonly menuTitle = computed(() => {
    const role = this.session.role();
    return role ? NAVIGATION[role].title : '';
  });

  protected readonly today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}
