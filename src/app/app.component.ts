import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DemoClock } from './core/services/demo-clock.service';
import { ThemeService } from './core/services/theme.service';
import { ToastContainerComponent } from './shared/ui/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  // Instancié dès la racine pour appliquer le thème enregistré avant le premier affichage.
  private readonly theme = inject(ThemeService);
  // Instancié avant tout calcul de date : il applique le décalage de la date de démonstration.
  private readonly clock = inject(DemoClock);
}
