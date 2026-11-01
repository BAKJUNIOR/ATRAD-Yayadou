import { endpoints } from './endpoints';

/**
 * Environnement de démonstration (`ng build --configuration demo`). `baseUrl` : adresse de l'API de démo, à
 * renseigner ; vide = même origine que le front. `config/app-config.json` peut la surcharger au déploiement.
 */
export const environment = {
  production: true,
  name: 'demo',
  baseUrl: '',
  endpoints,
};
