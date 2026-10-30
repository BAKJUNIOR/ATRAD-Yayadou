import { DOCUMENT } from '@angular/common';
import { Service, effect, inject } from '@angular/core';
import { BrandService } from './brand.service';
import { VocabularyLabels, applyVocabulary } from '../utils/vocabulary.util';

/** Éléments dont le texte n'est jamais réécrit. */
const SKIPPED = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE)$/;
const ATTRIBUTES = ['placeholder', 'title', 'aria-label'];

/**
 * Applique le vocabulaire de l'administrateur à tout le texte affiché (textes, `placeholder`,
 * `title`, `aria-label`), y compris celui que les écrans produisent ensuite. Une zone marquée
 * `data-novocab` (saisie du vocabulaire) est laissée telle quelle.
 */
@Service()
export class VocabularyService {
  private readonly document = inject(DOCUMENT);
  private readonly brand = inject(BrandService);

  private vocab: VocabularyLabels = this.brand.brand().vocab;
  /** Dernière valeur écrite, pour ne pas retraiter un texte déjà converti. */
  private readonly written = new WeakMap<Node, string>();
  private readonly writtenAttr = new WeakMap<Element, Record<string, string>>();
  private observer: MutationObserver | null = null;

  constructor() {
    effect(() => {
      const vocab = this.brand.brand().vocab;
      if (JSON.stringify(vocab) !== JSON.stringify(this.vocab)) {
        this.vocab = vocab;
        this.walk(this.document.body);
      }
    });
  }

  /** Démarre l'observation du document (appelé une fois, au démarrage). */
  install(): void {
    if (this.observer || typeof MutationObserver === 'undefined') {
      return;
    }
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          this.text(mutation.target);
        } else if (mutation.type === 'attributes') {
          this.attributes(mutation.target as Element);
        } else {
          mutation.addedNodes.forEach((node) => this.walk(node));
        }
      }
    });
    this.observer.observe(this.document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES,
    });
    this.walk(this.document.body);
  }

  private walk(root: Node): void {
    if (root.nodeType === Node.TEXT_NODE) {
      this.text(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || /^(SCRIPT|STYLE)$/.test(root.nodeName)) {
      return;
    }
    this.attributes(root as Element);
    const walker = this.document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        this.text(node);
      } else {
        this.attributes(node as Element);
      }
    }
  }

  private text(node: Node): void {
    const parent = node.parentElement;
    if (
      !parent ||
      SKIPPED.test(parent.nodeName) ||
      parent.closest('[contenteditable], [data-novocab]')
    ) {
      return;
    }
    const value = node.nodeValue ?? '';
    if (this.written.get(node) === value) {
      return;
    }
    const next = applyVocabulary(value, this.vocab);
    this.written.set(node, next);
    if (next !== value) {
      node.nodeValue = next;
    }
  }

  private attributes(element: Element): void {
    if (!element.getAttribute || element.closest('[data-novocab]')) {
      return;
    }
    const written = this.writtenAttr.get(element) ?? {};
    for (const name of ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (!value || written[name] === value) {
        continue;
      }
      const next = applyVocabulary(value, this.vocab);
      written[name] = next;
      if (next !== value) {
        element.setAttribute(name, next);
      }
    }
    this.writtenAttr.set(element, written);
  }
}
