import { Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NAVIGATION } from '../../core/navigation/navigation';
import { BrandService } from '../../core/services/brand.service';
import { PageTitleStrategy } from '../../core/services/page-title.strategy';
import { SessionService } from '../../core/services/session.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { ReceptionContext } from '../../domains/accueil/presentation/reception-context.service';
import { BrouillonStore } from '../../domains/agence/infrastructure/store/brouillon.store';
import { TraitementContext } from '../../domains/traitement/presentation/traitement-context.service';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';
import { BackdropComponent } from '../backdrop/backdrop.component';

const HOME_TITLE = 'Accueil';

/** Coquille des écrans connectés : barre latérale, en-tête, titre de l'écran et zone de contenu. */
@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterOutlet, AppHeaderComponent, AppSidebarComponent, BackdropComponent],
  host: { '(document:keydown.escape)': 'sidebar.setMobileOpen(false)' },
  template: `
    <button
      type="button"
      class="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-control focus:bg-card focus:px-3 focus:py-2 focus:text-[13px] focus:text-ink focus:shadow-raised"
      (click)="main.focus()"
    >
      Aller au contenu
    </button>

    <div class="min-h-screen bg-soft lg:flex">
      <app-sidebar />
      <app-backdrop />
      <div class="flex min-w-0 flex-1 flex-col">
        <app-header />
        <main
          #main
          tabindex="-1"
          class="w-full flex-1 px-3.5 pt-5 pb-9 outline-none lg:px-[30px] lg:pt-[26px] lg:pb-11"
        >
          <div class="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <h1 class="truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">
              {{ pageTitle() }}
            </h1>
            <nav
              aria-label="Fil d'Ariane"
              class="flex min-w-0 items-center gap-1.5 overflow-hidden text-[13px] whitespace-nowrap text-ink-muted"
            >
              <a routerLink="/" class="flex-none hover:text-brand-ink hover:underline">
                {{ appName() }}
              </a>
              <span aria-hidden="true">›</span>
              <span class="min-w-0 truncate">{{ menuTitle() }}</span>
              @if (showPageCrumb()) {
                <span aria-hidden="true">›</span>
                <span class="truncate text-ink">{{ pageTitle() }}</span>
              }
            </nav>
          </div>
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppLayoutComponent {
  private readonly session = inject(SessionService);
  protected readonly sidebar = inject(SidebarService);

  protected readonly appName = inject(BrandService).appName;
  protected readonly pageTitle = inject(PageTitleStrategy).pageTitle;
  protected readonly menuTitle = computed(() => {
    const role = this.session.role();
    return role ? NAVIGATION[role].title : '';
  });
  /** Sur l'accueil, le fil d'Ariane s'arrête au parcours. */
  protected readonly showPageCrumb = computed(() => this.pageTitle() !== HOME_TITLE);

  private readonly brouillon = inject(BrouillonStore);
  private readonly reception = inject(ReceptionContext);
  private readonly traitement = inject(TraitementContext);

  constructor() {
    // Données du profil connecté, lues dans l'API à l'ouverture de la session (pastilles du menu, accueil).
    effect(() => {
      const account = this.session.account();
      untracked(() => {
        if (account?.role === 'agence') {
          void this.brouillon.load().catch(() => undefined);
        }
        if (account?.role === 'traitement') {
          void this.traitement.load();
        }
        if (this.reception.canReceive()) {
          this.reception.load();
        }
      });
    });
  }
}
