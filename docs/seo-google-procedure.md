# Procédure pour rendre le site visible sur Google

## État actuel

- Le site n’est pas encore publié : aucune URL de production n’est configurée.
- Les pages restent en `noindex` tant que l’URL publique et l’autorisation d’indexer ne sont pas définies. Le sitemap est alors volontairement absent.
- Les pages publiques produisent des métadonnées par route et des instantanés HTML; les pages de connexion et d’administration restent en `noindex`.
- Le contenu public de Supabase répond correctement. Le fait qu’un contenu soit publié dans le CMS ne signifie pas qu’il a été vérifié par le cabinet.

## 1. Valider le contenu avant publication

Vérifier dans l’administration, puis avec le cabinet :

- nom du cabinet, adresse complète, ville, téléphone, courriel et horaires;
- soins réellement proposés, noms et qualifications de l’équipe;
- autorisations pour les photos et les témoignages;
- articles relus par un professionnel, sans texte d’exemple ni promesse médicale;
- liens de rendez-vous, carte et coordonnées cohérents sur toutes les pages.

Ne pas demander l’indexation de données provisoires ou d’exemples.

## 2. Publier et choisir l’adresse canonique

1. Publier l’application depuis Replit pour obtenir son URL de production, ou configurer d’abord le domaine personnalisé et son HTTPS.
2. Utiliser l’URL racine HTTPS officielle, sans chemin `/contact` ni adresse d’aperçu `.replit.dev`.
3. Si le site utilise une adresse Replit publiée en `*.replit.app`, cette adresse peut servir de canonique. Si un domaine personnalisé est ensuite utilisé, le garder comme seule adresse canonique.

## 3. Activer l’indexation

Dans les variables de l’environnement utilisé pour la **construction de production**, configurer :

- `VITE_SITE_URL` : URL racine HTTPS canonique;
- `VITE_SITE_INDEXABLE` : `true`, uniquement après validation du contenu;
- `VITE_SITE_TITLE` et `VITE_SITE_DESCRIPTION` : facultatifs; le site peut les déduire du contenu public;
- `VITE_SITE_OG_IMAGE_URL` : facultatif si la bannière publique du CMS est une image HTTPS utilisable pour le partage.

Ne jamais placer la clé `SUPABASE_SERVICE_ROLE_KEY` dans une variable `VITE_*` ni dans le navigateur.

Reconstruire et republier le site après tout changement de ces variables.

## 4. Vérifier avant de demander l’indexation

Sur le domaine de production :

1. Ouvrir `/robots.txt` : il doit autoriser l’exploration et déclarer le sitemap lorsque l’indexation est activée.
2. Ouvrir `/sitemap.xml` : vérifier que le document est XML et que les pages publiques importantes y figurent.
3. Vérifier la page d’accueil, `/soins`, `/equipe`, `/galerie`, `/avis`, `/faq`, `/blog/`, `/informations` et `/contact` : chacune doit avoir un titre et une description pertinents, une canonique HTTPS vers le domaine choisi et des balises sociales cohérentes.
4. Vérifier `/arm`, `/sign-in`, `/sign-up`, `/forgot-password` et `/auth/callback` : ces pages doivent rester `noindex` et ne pas apparaître dans le sitemap.
5. Lancer la vérification publique du site après le build; le contrôle vérifie aussi les articles publiés et leurs illustrations.

## 5. Déclarer le site à Google

1. Ajouter le domaine dans Google Search Console, idéalement en propriété « Domaine ».
2. Vérifier la propriété avec l’enregistrement DNS TXT fourni par Google. Cette étape nécessite l’accès au fournisseur du domaine.
3. Dans Search Console, soumettre `https://votre-domaine/sitemap.xml`.
4. Utiliser l’inspection d’URL pour la page d’accueil et les pages principales, puis demander leur indexation.
5. Consulter ensuite les rapports d’indexation, les problèmes de sécurité et les Core Web Vitals. La découverte peut prendre plusieurs jours ou davantage; une demande d’indexation ne garantit ni une date ni une position.

## 6. Renforcer la visibilité locale à Douala

- Créer ou revendiquer la fiche d’établissement Google et la faire vérifier.
- Employer le même nom, la même adresse, le même téléphone et les mêmes horaires sur le site et la fiche.
- Ajouter des photos récentes et répondre aux avis sans publier d’informations médicales privées.
- Publier régulièrement des conseils utiles, relus par un professionnel, et relier les articles aux pages de soins et de contact.

## Contrôles disponibles dans le projet

```sh
pnpm --filter @workspace/cabinet-dentaire run build
```

Le build génère les instantanés de pages, les balises et le sitemap seulement lorsque le domaine HTTPS et `VITE_SITE_INDEXABLE=true` sont configurés. Le test public s’exécute contre une URL de prévisualisation avec `CABINET_BASE_URL`; il ne soumet pas de formulaire.
