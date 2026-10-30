/** Libellés choisis par l'administrateur pour le tiers concerné et pour le dossier. */
export interface VocabularyLabels {
  tiers: string;
  dossier: string;
}

/** Reprend la casse de la première lettre du mot remplacé. */
function matchCase(word: string, reference: string): string {
  const first = reference.charAt(0);
  const head =
    first === first.toUpperCase() ? word.charAt(0).toUpperCase() : word.charAt(0).toLowerCase();
  return head + word.slice(1);
}

function plural(word: string): string {
  return /[sx]$/i.test(word) ? word : `${word}s`;
}

/**
 * Applique le vocabulaire à un texte affiché : « Client » et « Tiers » deviennent le libellé du
 * tiers, « Dossier » celui du dossier, et l'agence (hors nom propre : « Agence Plateau ») devient
 * l'entité émettrice.
 */
export function applyVocabulary(text: string, vocab: VocabularyLabels): string {
  if (!text || !/[a-z]/i.test(text)) {
    return text;
  }
  let out = text.replace(/\b(Clients?|clients?|Tiers|tiers)\b/g, (match) =>
    matchCase(/^clients$/i.test(match) ? plural(vocab.tiers) : vocab.tiers, match),
  );
  if (vocab.dossier !== 'Dossier') {
    out = out.replace(/\b(Dossiers?|dossiers?)\b/g, (match) =>
      matchCase(/s$/.test(match) ? plural(vocab.dossier) : vocab.dossier, match),
    );
  }
  return out
    .replace(/\ben agence\b/g, "à l'entité émettrice")
    .replace(
      /\b([Aa])gences? émettrices?\b/g,
      (match, a: string) =>
        (a === 'A' ? 'E' : 'e') + (/s /.test(match) ? 'ntités émettrices' : 'ntité émettrice'),
    )
    .replace(
      /\b([Aa])gence(s?)\b(?! [A-ZÀ-Ý])/g,
      (_match, a: string, s: string) => `${a === 'A' ? 'E' : 'e'}ntité${s} émettrice${s}`,
    );
}
