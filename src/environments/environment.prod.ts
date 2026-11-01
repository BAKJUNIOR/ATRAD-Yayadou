import { endpoints } from './endpoints';

/**
 * Environnement de production (`ng build`). `baseUrl` : adresse de l'API, à renseigner ; vide = même origine que
 * le front. `config/app-config.json` peut la surcharger au déploiement, sans reconstruire.
 */
export const environment = {
  production: true,
  name: 'prod',
  baseUrl: '',
  endpoints,
};
