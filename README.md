# ydxtrace-front
Interface web (Angular) de l'application de traçabilité des dossiers — Agences &amp; Back-Office — YAYADOU

## Déploiement (démo publique)

Démo en ligne : https://ydxtrace-demo-4d87f1.netlify.app (Netlify, offre gratuite).

Le site est publié depuis la branche `chore/deploiement-demo`, qui ne doit pas être fusionnée dans `develop` : elle porte le nom neutre « YDXTrace — Démo », la non-indexation (`noindex`, `public/robots.txt`) et la règle de routage (`public/_redirects`).

### Mettre à jour le site

```bash
git checkout chore/deploiement-demo
git merge develop                      # récupérer les dernières évolutions
npx ng build --configuration production
npx netlify-cli login                  # une seule fois, connexion par navigateur
npx netlify-cli deploy --prod --no-build \
  --dir dist/ydxtrace-front/browser \
  --site 4dd63305-ed3a-4d0d-a27d-637f13a1f02f
```

Sans `--prod`, la commande publie un aperçu à une adresse temporaire, sans toucher au lien public.

Le jeu de données interne (agences et produits réels) n'est ni versionné ni publié : il vit dans `src/app/domains/dossiers/domain/datasets.interne.local.ts`, ignoré par Git, et ne s'utilise qu'en local avec `npx ng serve --configuration interne`. Ne jamais publier un build `interne`.

### Limites

- Aucune donnée n'est partagée : dossiers, états, routage et thème sont enregistrés dans le navigateur de chaque visiteur. « Réinitialiser les données de démo » les efface.
- La connexion est simulée : tout mot de passe est accepté pour les comptes de démonstration.
- Le lien est public pour qui le connaît ; la non-indexation n'empêche que le référencement.
- Ne jamais écrire de jeton Netlify dans le dépôt : la connexion du CLI est conservée hors du projet.
