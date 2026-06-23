# TODO — EBH Pilot

> Backlog priorisé issu de l'audit (voir `AUDIT.md`). Aucun code modifié.
> **P1** = bloquant · **P2** = important · **P3** = amélioration.

---

## P1 — Bloquant

Ces points empêchent un fonctionnement réel ou une mise en production sûre.

- [ ] **Persister les POST en base.** Les handlers `POST /api/prospects` et
  `POST /api/products` valident puis renvoient un objet avec un UUID aléatoire
  sans écrire en base. Implémenter `prisma.prospect.create` / `prisma.product.create`.
- [ ] **Authentifier l'API.** Aucun middleware ne vérifie le JWT Supabase.
  Ajouter un middleware qui valide le `Authorization: Bearer <token>` et
  rejette (401) les requêtes non authentifiées sur `/api/*`.
- [ ] **Scoper les données par utilisateur.** Les `findMany` ne filtrent pas
  par `userId`. Récupérer l'utilisateur depuis le token et filtrer
  (`where: { userId }`) en lecture comme en écriture.
- [ ] **Restreindre le CORS.** Remplacer `cors()` par une liste blanche
  d'origines (origine du front uniquement) configurée par variable d'env.
- [ ] **Encadrer le mode démo.** `signInDemo` ne doit être disponible qu'en
  développement (garde sur `import.meta.env.DEV`) pour éviter tout contournement
  d'auth en production.

---

## P2 — Important

Nécessaires pour la fiabilité, la qualité et l'exploitabilité.

- [ ] **Calculer les métriques du dashboard depuis la base.** Remplacer les
  valeurs en dur par des agrégats Prisma (CA, marge moyenne, comptes).
- [ ] **Middleware d'erreurs centralisé.** Ajouter un gestionnaire d'erreurs
  Express ; arrêter de masquer les pannes DB par un `catch` qui renvoie `[]`
  (distinguer « base vide » de « base injoignable »).
- [ ] **Valider les variables d'environnement au démarrage.** Schéma Zod
  (`DATABASE_URL`, `PORT`, clés Supabase) qui échoue tôt si une variable manque.
- [ ] **Committer une migration Prisma initiale.** `prisma/migrations` est absent ;
  générer et versionner la première migration pour reproductibilité.
- [ ] **Ajouter des tests.** Au minimum : tests d'intégration des routes API
  (Vitest/Supertest) et un test de rendu du Dashboard.
- [ ] **Mettre en place une CI.** Pipeline qui lance `lint`, `build` et tests
  sur chaque PR.
- [ ] **Logger structuré.** Remplacer les `console.log` par un logger (pino)
  avec niveaux et format JSON en production.
- [ ] **Feedback d'erreur côté front.** Gérer les états d'erreur de TanStack
  Query (toasts/bannières) plutôt que de retomber silencieusement sur la démo.

---

## P3 — Amélioration

Confort, performance et évolutivité à plus long terme.

- [ ] **Pagination des listes** prospects/produits (curseur ou offset).
- [ ] **Cache serveur** (ETag / cache-control) sur les GET dashboard.
- [ ] **Dockerfiles** pour web et api + `docker-compose` de dev avec Postgres local.
- [ ] **Documentation OpenAPI** générée depuis les schémas Zod (zod-to-openapi).
- [ ] **États vides explicites** sur Prospects/Produits (illustration + CTA).
- [ ] **Tests e2e** (Playwright) sur le parcours login → dashboard.
- [ ] **Accessibilité** : audit clavier/ARIA de la sidebar et des formulaires.
- [ ] **Skeleton loaders** plutôt que `placeholderData` statique.
- [ ] **Variables de thème supplémentaires** (densité, rayon) pour le design system.
- [ ] **Découpage du bundle** (lazy-loading des pages via React.lazy).

---

## Ordre d'attaque recommandé

1. Persistance POST + auth API + scoping utilisateur (le cœur fonctionnel et sécurité).
2. CORS + garde mode démo + validation d'env (durcissement rapide).
3. Migration committée + tests + CI (filet de sécurité avant d'itérer).
4. Métriques réelles + gestion d'erreurs + feedback front (qualité perçue).
5. P3 selon les besoins produit.
