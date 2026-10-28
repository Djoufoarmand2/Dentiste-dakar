# Cabinet Naya

Site vitrine fictif, en français, pour un cabinet dentaire à Douala. Les coordonnées, textes, articles, avis et campagnes de démonstration doivent être remplacés par des informations approuvées avant publication.

## Run & Operate

- `pnpm --filter @workspace/cabinet-dentaire run dev` — site React/Vite
- `pnpm --filter @workspace/api-server run dev` — API Express
- `pnpm run typecheck` — vérification TypeScript de tous les packages
- `pnpm run build` — construction des packages
- `pnpm --filter @workspace/api-spec run codegen` — régénérer les clients et schémas depuis le contrat API
- Secrets requis : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js, TypeScript
- Interface : React, Vite, Tailwind CSS
- API : Express 5
- Authentification : Clerk
- Contenu : Supabase Storage, via le serveur uniquement
- Contrats et validation : OpenAPI, Orval et Zod

## Where things live

- `artifacts/cabinet-dentaire/` — pages publiques, espace d’administration et styles
- `artifacts/api-server/src/routes/site-content.ts` — lecture publique et publication réservée à l’administrateur
- `artifacts/api-server/src/lib/siteContentDefaults.ts` — contenu initial fictif; toutes les URL d’images sont vides
- `lib/api-spec/openapi.yaml` — contrat source de l’API; régénérer les fichiers générés après modification

## Architecture decisions

- Le contenu du site est un document JSON dans le bucket privé `cabinet-site-content` de Supabase Storage. L’API sert le contenu public et garde la clé service-role côté serveur.
- Les fichiers image et vidéo restent hébergés ailleurs. L’administration enregistre leurs URL; elle ne téléverse pas les fichiers dans Supabase.
- Le serveur compare l’adresse principale du compte Clerk à `ADMIN_EMAIL` avant d’accepter une publication. La route `/admin` côté navigateur n’est pas une protection à elle seule.
- Le contrat OpenAPI est la source de vérité; ne pas modifier directement les clients et schémas générés.

## Product

- Pages publiques : accueil, soins, équipe, galerie, avis, FAQ, blog, informations et contact.
- Route d’administration non liée dans la navigation : `/admin`.
- L’administrateur peut mettre à jour les coordonnées, le contenu de l’accueil, les collections, les articles, les campagnes, ainsi que les URL de logo, photos et vidéos.

## User preferences

- Garder les contenus de départ fictifs et les zones de photos/logo sans image jusqu’à ce que le cabinet fournisse ses propres visuels.
- Utiliser le site de référence uniquement comme inspiration générale; ne pas reprendre son code, ses textes, son logo, ses photos ni reproduire exactement sa mise en page.

## Gotchas

- Le premier chargement public crée le bucket privé si nécessaire et y place le contenu de départ. Les secrets Supabase doivent donc être configurés avant d’ouvrir le site.
- Les comptes Clerk sont séparés entre développement et production; le compte autorisé doit utiliser l’adresse configurée dans `ADMIN_EMAIL`.
- L’application utilise les versions React du catalogue du workspace pour préserver la compatibilité Expo des autres packages.

## Pointers

- Voir la skill `pnpm-workspace` pour la structure du monorepo et les dépendances partagées.
