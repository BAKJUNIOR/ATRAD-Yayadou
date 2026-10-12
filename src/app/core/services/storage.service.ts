import { Service } from '@angular/core';

/**
 * Accès au localStorage, sérialisé en JSON.
 * Les erreurs (navigation privée, quota, valeur corrompue) sont absorbées : l'application
 * doit rester utilisable sans persistance.
 */
@Service()
export class StorageService {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Persistance indisponible : la valeur reste en mémoire pour la session en cours.
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Rien à nettoyer si le stockage est indisponible.
    }
  }
}
