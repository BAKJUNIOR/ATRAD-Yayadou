import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DemoClock } from './core/services/demo-clock.service';
import { ThemeService } from './core/services/theme.service';
import { VocabularyService } from './core/services/vocabulary.service';
import { ReferentielStore } from './domains/dossiers/infrastructure/store/referentiel.store';
import { RoutingStore } from './domains/dossiers/infrastructure/store/routing.store';
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
  // Instancié avant tout écran : il active le jeu de données et le paramétrage de l'administrateur
  // (entités, types d'état, circuits), lus par les règles métier.
  private readonly referentiel = inject(ReferentielStore);
  // Instancié avant toute réception : il applique le routage paramétré par l'administrateur.
  private readonly routing = inject(RoutingStore);

  constructor() {
    inject(VocabularyService).install();
  }
}
