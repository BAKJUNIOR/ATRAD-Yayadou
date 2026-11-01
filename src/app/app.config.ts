import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AppConfigService } from './core/services/app-config.service';
import { BrandService } from './core/services/brand.service';
import { PageTitleStrategy } from './core/services/page-title.strategy';
import { SessionService } from './core/services/session.service';
import { ThemeService } from './core/services/theme.service';
import { ReferentielStore } from './domains/dossiers/infrastructure/store/referentiel.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useExisting: PageTitleStrategy },
    // Le jeton est ajouté avant l'envoi ; les erreurs sont traduites au retour.
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // Adresse de l'API d'abord, puis la marque (écran de connexion aux bonnes couleurs) et, pour une session déjà
    // ouverte, le référentiel.
    provideAppInitializer(() => {
      const config = inject(AppConfigService);
      const brand = inject(BrandService);
      const theme = inject(ThemeService);
      const session = inject(SessionService);
      const referentiel = inject(ReferentielStore);
      return (
        config
          .loadConfig()
          .then(() => brand.refresh())
          // Mode sombre par défaut de la marque, tant que l'utilisateur n'a pas choisi.
          .then(() => theme.followBrandDefault())
          .then(() => (session.isAuthenticated() ? referentiel.refresh() : undefined))
      );
    }),
  ],
};
