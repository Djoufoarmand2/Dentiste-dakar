# Backend Supabase du cabinet

## Organisation

Le frontend React appelle directement Supabase. Il n'utilise plus les routes
Express ni Clerk pour les pages, les sessions et l'administration.

- **Table Editor → cabinet_site_content** : document complet du CMS, version de
  publication et date d'enregistrement.
- **cabinet_admins** : compte administrateur lié à un identifiant Supabase Auth.
- **cabinet_config** : configuration serveur privée, dont l'adresse autorisée.
- **cabinet_media** : références des médias, tailles, types et état du transfert.
- **Authentication → Users** : comptes et état de confirmation des adresses.
- **Storage → cabinet-media** : images et vidéos publiques du cabinet.
- **Storage → cabinet-site-content → backups** : sauvegardes privées de l'ancien
  contenu ; le fichier historique `cms/site-content.json` est conservé.
- **Edge Functions → cabinet-api** : lecture publique filtrée, vérification des
  droits, publication et gestion des médias.

Les tables complètes ne sont pas lisibles par les visiteurs. La réponse publique
exclut les articles non publiés et les campagnes inactives.

## Première connexion et récupération

1. Le propriétaire du compte reçoit une invitation Supabase à l'adresse
   autorisée dans `ADMIN_EMAIL`. L'adresse doit être confirmée avant tout accès.
2. Le lien de l'invitation conduit à `/auth/callback` pour choisir un mot de passe.
3. Ouvrir `/admin`, ou `/sign-in` pour se connecter ensuite.
4. Utiliser `/forgot-password` pour demander un nouveau lien.

Les anciens mots de passe Clerk ne sont pas importés et aucun mot de passe
administrateur par défaut n'a été créé. Un compte ordinaire, même muni de
métadonnées `role=admin`, ne reçoit aucun droit de publication.

Le rattachement du premier compte est effectué par le serveur après vérification
de son identité et de son adresse confirmée. Un changement d'administrateur doit
être effectué avec un accès de gestion autorisé ; aucun formulaire public ne
permet de modifier cette autorisation.

## Médias

Les champs logo, image et vidéo proposent le téléversement, la prévisualisation,
la sélection dans la médiathèque et la saisie d'un lien externe.

Sur la page publique `/informations`, une campagne au type « vidéo » avec une
URL vidéo affiche le lecteur natif directement dans la carte : commandes de
lecture accessibles, sans démarrage automatique, chargement limité aux
métadonnées avant lecture. L'image de campagne sert d'affiche si elle existe ;
sinon le lecteur s'affiche sur un fond bleu. Les campagnes désactivées restent
invisibles. La vidéo n'est pas intégrée au hero de la page d'accueil.

- Images : JPEG, PNG, WebP et GIF, jusqu'à **10 Mio**.
- Vidéos : MP4 et WebM, jusqu'à **50 Mio**.
- Maximum actuel : **1 000 références** dans la médiathèque.
- Transferts directs vers Supabase Storage avec le protocole TUS et une
  progression visible ; aucune vidéo ne transite par Express.
- Les transferts sont vérifiés avant de pouvoir être sélectionnés pour publier.
- Les fichiers sont publics : ne pas y déposer de documents médicaux ni de
  données de patients.
- Un fichier référencé par le contenu enregistré ne peut pas être supprimé :
  retirer sa référence, publier, puis confirmer sa suppression.
- Un transfert interrompu peut être nettoyé dans la médiathèque. Une suppression
  interrompue est également réessayable ; elle bloque toute nouvelle référence
  publiée jusqu'à son nettoyage.

Les plafonds de stockage, de bande passante et d'envoi d'e-mails du projet
Supabase s'ajoutent à ces limites applicatives. Le service d'e-mail doit être
configuré selon les besoins du cabinet ; le retour de l'API d'envoi ne garantit
pas la réception dans la boîte de destination.

## Configuration et domaines

Le navigateur reçoit uniquement :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — clé publique du projet, jamais la clé service.

Les outils de migration utilisent les secrets serveur `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN` et `ADMIN_EMAIL`. Ne jamais
les afficher ni les ajouter au frontend.

La fonction utilise ses clés serveur natives Supabase et le secret
`CABINET_ALLOWED_ORIGINS`. La vérification JWT du portail est désactivée parce
que la fonction propose aussi des lectures publiques ; **toutes** ses opérations
administrateur vérifient le jeton auprès de Supabase Auth puis les droits en base.

L'origine de développement est autorisée explicitement. Les origines locales
exactes `http://127.0.0.1` et `http://localhost` permettent les captures de la
prévisualisation ; aucun joker CORS n'est accepté. Avant un changement de domaine,
ajouter le domaine réel dans cette liste et son URL `/auth/callback` dans
Authentication → URL Configuration → Redirect URLs. Ne jamais deviner l'adresse
d'un futur site publié ni remplacer les origines par `*`.

L'hébergement frontend n'est pas assuré par Supabase. Aucune publication du
frontend ni migration Cloudflare n'est effectuée par cette procédure.

## Scripts et vérifications

À la racine du projet :

```sh
pnpm --filter @workspace/scripts run cabinet:supabase backup
pnpm --filter @workspace/scripts run cabinet:supabase setup
pnpm --filter @workspace/scripts run cabinet:supabase deploy
pnpm --filter @workspace/scripts run cabinet:supabase inspect
node scripts/src/check-cabinet-supabase.mjs
pnpm --filter @workspace/cabinet-dentaire run typecheck
PORT=5001 BASE_PATH=/ pnpm --filter @workspace/cabinet-dentaire run build
```

`setup` préserve les données existantes : il n'écrase pas un document déjà
importé et conserve la première sauvegarde de configuration. Examiner tout
changement de schéma avant de le réappliquer. `deploy` compile les schémas
générés depuis OpenAPI avec la fonction ; redéployer après toute évolution
du contrat qui affecte la validation.

Le contrôle d'intégration crée puis retire un compte ordinaire de test. Une fois
l'adresse administrateur réellement confirmée, il peut générer en mémoire une
session de test de ce compte sans connaître ni modifier son mot de passe ; il
publie des données temporaires puis restaure le contenu original et supprime ses
médias. Ne pas le lancer pendant une édition concurrente du cabinet. S'il indique
`blocked_pending_email_verification`, les tests administrateur n'ont **pas** réussi :
ils n'ont pas été exécutés.

## Retour arrière

Le code historique Express et les comptes Clerk sont conservés pour le retour
arrière. L'entrée actuelle du serveur pointe vers `retired-app.ts` : un
redémarrage accidentel ne réactive pas ses anciennes routes ; elles répondent
HTTP 410. Ne pas supprimer les sauvegardes ni les comptes pour restaurer.

1. Arrêter les publications pendant la restauration pour éviter deux sources
   de contenu actives.
2. Sauvegarder le document PostgreSQL actuel et exporter son contenu complet dans
   le format SiteContent avant tout retour à l'ancien backend : le JSON
   historique n'est pas synchronisé avec les nouvelles publications.
3. Restaurer le frontend de la version précédente et rétablir l'import de
   `./app` dans `artifacts/api-server/src/index.ts`, puis redémarrer les workflows
   d'origine avec les clés Clerk existantes et les dépendances frontend Clerk.
4. Importer le dernier contenu validé dans le stockage privé historique seulement
   après sauvegarde et vérification, puis contrôler le site et l'accès Clerk.
5. Conserver les ressources Supabase nouvelles jusqu'à validation de la
   restauration ; aucun script de suppression automatique n'est fourni.

Ne pas simplement redémarrer l'ancien serveur avec un ancien JSON en supposant
qu'il contient les dernières publications.
