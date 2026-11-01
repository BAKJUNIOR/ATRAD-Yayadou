import { endpoints } from './endpoints';

/**
 * Environnement local. `baseUrl` vide : les appels partent vers `/api` et `/ws` sur l'origine du front, et
 * `ng serve` les relaie vers le backend local (`proxy.conf.json`).
 */
export const environment = {
  production: false,
  name: 'local',
  baseUrl: '',
  endpoints,
};
