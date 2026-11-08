# Clinique Sourire Serein

Site vitrine en français pour la Clinique Sourire Serein, cabinet dentaire situé au sein de la Clinique La Bienveillance à Douala. Les informations confirmées proviennent du cahier des charges remis par le cabinet; ne pas inventer de praticiens, témoignages ou mentions légales.

## Données officielles confirmées

- Adresse : Ancienne gare routière, Dakar, Douala, Cameroun.
- Téléphone / WhatsApp : +237 677 87 34 42.
- Courriel : bienveillanceclinique4@dentiste-sourireserein.cm.
- Horaires communiqués : 24 h/24, 7 j/7 ; inviter les visiteurs à appeler pour confirmer la disponibilité dentaire.
- Carte : lien Google Maps officiel fourni dans le contenu Supabase.
- Établissement d’accueil : Clinique La Bienveillance — https://cliniquelabienveillance.com.
- Le site reste `noindex` tant que le domaine public final et les paramètres SEO officiels ne sont pas confirmés.

## Run & Operate

- `pnpm --filter @workspace/cabinet-dentaire run dev` — site React/Vite
- `pnpm --filter @workspace/api-server run dev` — ancien backend conservé pour le retour arrière ; le frontend ne l'utilise plus
- `pnpm run typecheck` — vérification TypeScript de tous les packages
- `pnpm run build` — construction des packages
- `pnpm --filter @workspace/api-spec run codegen` — régénérer les clients et schémas depuis le contrat API
- Frontend : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (configuration publique).
- SEO public facultatif : `VITE_SITE_URL`, `VITE_SITE_INDEXABLE=true`, `VITE_SITE_TITLE`, `VITE_SITE_DESCRIPTION`, `VITE_SITE_OG_IMAGE_URL`. Ne renseigner ces valeurs qu’après validation des informations du cabinet et de son domaine officiel ; ne jamais utiliser le domaine de prévisualisation.
- Outils de migration : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `ADMIN_EMAIL` (secrets serveur).
- Les secrets Clerk existants sont conservés uniquement pour le retour arrière.

## Stack

- pnpm workspaces, Node.js, TypeScript
- Interface : React, Vite, Tailwind CSS
- API : Supabase Edge Functions
- Authentification : Supabase Auth
- Contenu : Supabase PostgreSQL ; médias : Supabase Storage
- Contrats et validation : OpenAPI, Orval et Zod

## Where things live

- `artifacts/cabinet-dentaire/` — pages publiques, espace d’administration et styles
- `supabase/functions/cabinet-api/` — API distante publique et administrateur
- `supabase/migrations/` — schéma et autorisations du cabinet
- `scripts/src/cabinet-supabase.mjs` — sauvegarde, installation et déploiement du backend
- `docs/supabase-cabinet.md` — exploitation, accès, limites et retour arrière
- `artifacts/api-server/src/routes/site-content.ts` — ancien backend, conservé pour restauration
- `artifacts/api-server/src/lib/siteContentDefaults.ts` — contenu historique du backend retiré
- `lib/api-spec/openapi.yaml` — contrat source de l’API; régénérer les fichiers générés après modification

## Architecture decisions

- Le contenu complet est un document JSONB versionné dans PostgreSQL. La fonction publique filtre les contenus non publiés ; les tables complètes sont protégées par RLS.
- Le JSON historique et ses sauvegardes privées dans `cabinet-site-content` sont conservés, sans synchronisation automatique depuis PostgreSQL.
- Les images et vidéos sont téléversées directement dans `cabinet-media`, sans serveur Express. Les liens externes restent acceptés.
- Supabase Auth vérifie l'identité ; une autorisation serveur liée à l'adresse confirmée configurée dans `ADMIN_EMAIL` protège les publications. Les métadonnées utilisateur ne donnent aucun droit administrateur.
- La publication est atomique et versionnée ; une édition obsolète ne peut pas écraser une publication plus récente. La suppression des médias partage le verrou de publication pour protéger les références.
- Le contrat OpenAPI est la source de vérité; ne pas modifier directement les clients et schémas générés.

## Product

- Pages publiques : accueil, soins, équipe, galerie, avis, FAQ, blog, informations et contact.
- Route d’administration non liée dans la navigation : `/arm` ; `/admin` n’existe plus.
- L’administrateur peut mettre à jour les coordonnées, le contenu de l’accueil, les collections, les articles, les campagnes, ainsi que les URL de logo, photos et vidéos.

## User preferences

- Utiliser les coordonnées et visuels fournis par le cabinet ; ne jamais inventer les identités de praticiens, qualifications, témoignages ou mentions légales manquants.
- Reprendre fidèlement la présentation et la structure de base de cabinetdentairegloria.com, tout en gardant notre logique de base, nos contenus, Supabase et l’administration. Ne pas reprendre son code, ses textes, son logo ni ses photos.
- Palette souhaitée : bleu, violet de nuit et blanc, avec des transparences et des animations respectant la réduction des mouvements.
- Supabase gère le backend ; Cloudflare Pages héberge le site et Cloudflare gère le DNS. Le domaine public est `https://dentiste-sourireserein.cm`.
- Le dépôt GitHub effectif est `Djoufoarmand2/Dentiste-dakar`. Les commits sur `main` déclenchent une publication Cloudflare, selon le choix explicite de l’utilisateur.

## Gotchas

- Le frontend ne crée ni ne réinitialise de données au chargement. Une erreur de lecture doit rester explicite.
- L'adresse de l'administrateur doit être confirmée via Supabase Auth. Ne pas désactiver cette vérification pour contourner un problème d'e-mail.
- Sans SMTP propre, l'envoi Supabase de démonstration est limité et n'offre pas de garantie de livraison ; invitations et récupération doivent être validées avant de considérer la migration terminée.
- Le site reste `noindex` et sans sitemap tant que l’identité, les coordonnées, le domaine officiel et l’image de partage ne sont pas confirmés. Le build n’active l’indexation et ne génère le sitemap qu’avec l’ensemble des paramètres SEO publics ci-dessus.
- Le build Vite génère le HTML initial, les métadonnées, les URL canoniques et le sitemap depuis le contenu public Supabase. Après une publication admin, un hook Cloudflare régénère ces fichiers ; l’actualisation du site ne signifie pas que Google a déjà réindexé ses pages.
- Le catalogue React du workspace reste inchangé pour préserver la compatibilité des autres packages.

## Pointers

- Voir la skill `pnpm-workspace` pour la structure du monorepo et les dépendances partagées.
