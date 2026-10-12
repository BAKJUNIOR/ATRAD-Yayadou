import { Service, inject, signal } from '@angular/core';
import { StorageService } from '../../../../core/services/storage.service';
import { Contact, EMPTY_CONTACT } from '../../domain/profile.rules';

const PROFILE_KEY = 'atrad_profile_v1';

/**
 * Coordonnées saisies par chaque utilisateur, par identifiant de connexion.
 * Conservées dans le navigateur en attendant l'API.
 */
@Service()
export class ProfileStore {
  private readonly storage = inject(StorageService);

  private readonly contacts = signal<Record<string, Contact>>(
    this.storage.get<Record<string, Contact>>(PROFILE_KEY) ?? {},
  );

  contactOf(ident: string): Contact {
    return { ...EMPTY_CONTACT, ...this.contacts()[ident] };
  }

  saveContact(ident: string, contact: Contact): void {
    this.contacts.update((contacts) => ({ ...contacts, [ident]: contact }));
    this.storage.set(PROFILE_KEY, this.contacts());
  }

  reset(): void {
    this.contacts.set({});
    this.storage.remove(PROFILE_KEY);
  }
}
