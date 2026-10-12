import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';
import { BackdropComponent } from '../backdrop/backdrop.component';

/** Coquille des écrans connectés : barre latérale, en-tête et zone de contenu. */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent, BackdropComponent],
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
          class="mx-auto w-full max-w-(--breakpoint-2xl) flex-1 p-4 outline-none md:p-7"
        >
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppLayoutComponent {
  protected readonly sidebar = inject(SidebarService);
}
