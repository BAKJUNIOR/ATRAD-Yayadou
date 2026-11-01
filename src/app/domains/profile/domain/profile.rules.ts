/** Coordonnées qu'un utilisateur peut modifier lui-même. */
export interface Contact {
  email: string;
  phone: string;
}

export const EMPTY_CONTACT: Contact = { email: '', phone: '' };

export const PASSWORD_MIN_LENGTH = 8;

/** Erreur de saisie d'une adresse e-mail ; vide si elle est acceptable (ou non renseignée). */
export function emailError(email: string): string {
  const value = email.trim();
  if (!value) {
    return '';
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? ''
    : 'Adresse e-mail invalide (ex. prenom.nom@domaine.com).';
}

/** Erreur de saisie d'un téléphone ; vide s'il est acceptable (ou non renseigné). */
export function phoneError(phone: string): string {
  const value = phone.trim();
  if (!value) {
    return '';
  }
  const digits = value.replace(/\D/g, '').length;
  return /^\+?[\d\s().-]+$/.test(value) && digits >= 8 && digits <= 15
    ? ''
    : 'Numéro invalide : 8 à 15 chiffres (ex. +225 07 00 00 00 00).';
}

export interface PasswordChange {
  current: string;
  next: string;
  confirmation: string;
}

export type PasswordErrors = Partial<Record<keyof PasswordChange, string>>;

export function passwordErrors(change: PasswordChange): PasswordErrors {
  const errors: PasswordErrors = {};
  if (!change.current) {
    errors.current = 'Saisissez votre mot de passe actuel.';
  }
  if (change.next.length < PASSWORD_MIN_LENGTH) {
    errors.next = `Au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  } else if (!/[A-Za-z]/.test(change.next) || !/\d/.test(change.next)) {
    errors.next = 'Au moins une lettre et un chiffre.';
  } else if (change.next === change.current) {
    errors.next = "Le nouveau mot de passe doit être différent de l'actuel.";
  }
  if (change.confirmation !== change.next) {
    errors.confirmation = 'La confirmation ne correspond pas au nouveau mot de passe.';
  }
  return errors;
}

/** `Aminata Diallo` → prénom `Aminata`, nom `Diallo`. */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const [firstName = '', ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

/** `Agent d'agence — Agence Plateau` → `Agent d'agence`. */
export function jobTitle(roleLabel: string): string {
  return roleLabel.split(' — ')[0];
}
