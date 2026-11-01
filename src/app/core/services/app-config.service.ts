import { Service } from '@angular/core';
import { environment } from '../../../environments/environment';

interface AppConfig {
  apiBaseUrl?: string;
}

/**
 * Adresse de l'API. Ordre de priorité : `config/app-config.json` (réécrit au déploiement, sans reconstruire le
 * front), puis `environment.baseUrl`. Vide : même origine que le front (proxy en local).
 */
@Service()
export class AppConfigService {
  private baseUrl = environment.baseUrl;

  get apiBaseUrl(): string {
    return this.baseUrl;
  }

  /** Appelé une fois au démarrage ; `fetch` plutôt que HttpClient pour ne pas passer par les intercepteurs. */
  async loadConfig(): Promise<void> {
    try {
      const response = await fetch('config/app-config.json', { cache: 'no-store' });
      if (response.ok) {
        const config = (await response.json()) as AppConfig;
        if (typeof config.apiBaseUrl === 'string' && config.apiBaseUrl.trim()) {
          this.baseUrl = config.apiBaseUrl.trim();
        }
      }
    } catch {
      // Fichier absent : on garde l'adresse de l'environnement.
    }
    this.baseUrl = this.baseUrl.replace(/\/+$/, '');
  }
}
