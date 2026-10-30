import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Clock } from './core/services/clock.service';
import { ThemeService } from './core/services/theme.service';
import { VocabularyService } from './core/services/vocabulary.service';
import { ReferentielStore } from './domains/dossiers/infrastructure/store/referentiel.store';
import { ToastContainerComponent } from './shared/ui/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  // Instancié dès la racine pour appliquer le thème enregistré avant le premier affichage.
  private readonly theme = inject(ThemeService);
  // Instancié avant tout calcul de date : il efface l'ancien décalage de la date de démonstration.
  private readonly clock = inject(Clock);
  // Instancié avant tout écran : il active le jeu de données et le paramétrage de l'administrateur
  // (entités, types d'état, circuits), lus par les règles métier.
  private readonly referentiel = inject(ReferentielStore);

  constructor() {
    inject(VocabularyService).install();
  }
}
