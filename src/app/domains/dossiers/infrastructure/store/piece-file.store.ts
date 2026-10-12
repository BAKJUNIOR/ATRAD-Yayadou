import { Service } from '@angular/core';

const DB_NAME = 'atrad_files';
const STORE_NAME = 'files';

/**
 * Contenu des pièces jointes, conservé dans IndexedDB le temps de construire les écrans.
 * Sera remplacé par l'envoi des fichiers à l'API ; seules les métadonnées vivent dans le dossier.
 */
@Service()
export class PieceFileStore {
  private database: Promise<IDBDatabase> | null = null;

  put(id: string, file: Blob): Promise<void> {
    return this.run('readwrite', (store) => store.put(file, id)).then(() => undefined);
  }

  get(id: string): Promise<Blob | null> {
    return this.run<Blob | undefined>('readonly', (store) => store.get(id)).then(
      (blob) => blob ?? null,
    );
  }

  delete(id: string): Promise<void> {
    return this.run('readwrite', (store) => store.delete(id)).then(() => undefined);
  }

  private open(): Promise<IDBDatabase> {
    this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.database;
  }

  private async run<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const request = operation(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
