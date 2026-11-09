export const PASSWORD_MIN_LENGTH = 8;

/** Mêmes règles que l'API : 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial. */
export function newPasswordError(password: string): string {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return 'Au moins une majuscule et une minuscule.';
  }
  if (!/\d/.test(password)) {
    return 'Au moins un chiffre.';
  }
  if (!/[^\p{L}\p{N}\s]/u.test(password)) {
    return 'Au moins un caractère spécial (ex. ! ? @ #).';
  }
  return '';
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
