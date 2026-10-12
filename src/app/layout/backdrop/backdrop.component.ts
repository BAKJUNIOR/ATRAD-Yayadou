import { Component, inject } from '@angular/core';
import { SidebarService } from '../../core/services/sidebar.service';

/** Voile cliquable derrière le tiroir de navigation (écrans étroits). */
@Component({
  selector: 'app-backdrop',
  template: `
    @if (sidebar.isMobileOpen()) {
      <div
        class="fixed inset-0 z-40 bg-navy/45 lg:hidden"
        (click)="sidebar.setMobileOpen(false)"
      ></div>
    }
  `,
})
export class BackdropComponent {
  protected readonly sidebar = inject(SidebarService);
}
