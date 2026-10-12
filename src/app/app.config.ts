import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { PageTitleStrategy } from './core/services/page-title.strategy';

// Pas de provideHttpClient pour l'instant : les écrans s'appuient sur des données fictives
// (`infrastructure/mock`). Il sera ajouté ici, avec ses intercepteurs, au branchement de l'API.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useExisting: PageTitleStrategy },
  ],
};
