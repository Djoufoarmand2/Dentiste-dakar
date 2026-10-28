# Vérification de la migration Supabase

## Contrôles effectués

- Compilation TypeScript de tout le workspace : réussie.
- Construction de production du frontend : réussie. Vite signale un gros
  fragment JavaScript et un avertissement de sourcemap dans le composant
  tooltip ; ils ne bloquent pas la construction.
- Vérification du bundle : aucune valeur des clés serveur privilégiées
  recherchées n'y figure.
- Site public vérifié sur ordinateur et téléphone avec l'ancienne API arrêtée.
- Compte administrateur confirmé dans Supabase Auth après validation de
  l'invitation par son propriétaire.
- Renouvellement réel de session par `refreshSession` réussi ; le nouveau jeton
  conserve l'accès administrateur. La session temporaire a ensuite été révoquée.
- Récupération et remplacement de mot de passe vérifiés sur un compte jetable :
  lien de récupération généré en mémoire, validation, nouveau mot de passe accepté
  et ancien mot de passe refusé. Le compte a été supprimé. Aucun mot de passe du
  propriétaire n'a été consulté ni modifié.
- 37 assertions d'intégration backend réussies : lecture publique filtrée,
  CORS explicite, refus des faux jetons, des accès anonymes, des comptes ordinaires
  et des métadonnées de rôle falsifiées, restrictions SQL/RLS et Storage,
  publication versionnée, validation des données et des types/tailles, transfert
  d'image, finalisation, refus de supprimer un média utilisé, nettoyage.
- Redémarrage accidentel de l'ancien backend vérifié : ses anciennes routes CMS
  répondent HTTP 410, sans réactiver Clerk. Le workflow est ensuite arrêté.

## Parcours navigateur

Le même parcours éditorial a été poursuivi après correction d'une ambiguïté
dans son protocole : la vidéo appartient aux campagnes et non au hero, dont
le média reste une image conformément à l'interface existante.

- Session administrateur chargée, puis conservée après rechargement.
- Brouillon non publié conservé lors des changements de section.
- Téléversement PNG par le vrai champ fichier, progression, prévisualisation et
  sélection dans la médiathèque vérifiés. Un MIME incorrect est refusé.
- Téléversement TUS d'un MP4 dans une campagne ; prévisualisation réellement
  lisible et lecture vidéo constatée.
- La publication, la lecture du lecteur HTML5 intégré sur `/informations` et
  l'accessibilité des commandes du lecteur sont présentes dans la version
  courante ; le parcours de publication publique complet a été vérifié avant
  cette dernière modification du lecteur.
- Publication concurrente simulée : HTTP 409 affiché et brouillon conservé.
- Déconnexion par l'interface : l'éditeur ne reste pas accessible.
- Connexion d'un compte ordinaire par le formulaire : espace administrateur
  refusé.
- Aucun appel aux anciennes routes `/api/` ni à Clerk observé. L'ancien workflow
  est resté arrêté pendant ces parcours.
- Contenu d'origine restauré et seuls les médias temporaires des tests supprimés.
- Comparaison finale du document PostgreSQL avec le JSON pré-migration : identique.
  Comptes de test et fichier temporaire de session supprimés.
- Un message de succès de téléversement restait affiché après rechargement d'un
  champ média vide ; il est désormais effacé dans ce cas. Correction vérifiée par
  la compilation, sans répéter les parcours navigateur.

## Limites de cette vérification

- L'invitation a été reçue et validée par le propriétaire. Une nouvelle
  récupération de mot de passe n'a pas été exécutée jusqu'à réception dans sa
  boîte réelle, afin de ne pas changer son mot de passe ni multiplier les envois.
- Le service d'e-mail Supabase par défaut reste un service de démonstration,
  limité à deux messages par heure lors du contrôle. Un SMTP de production
  demeure recommandé.
- Le renouvellement de session testé immédiatement ne simule pas plusieurs
  heures d'inactivité.
- Les transferts réseau interrompus, les très gros volumes et la charge
  concurrente ne font pas l'objet d'un test de charge. Les limites et erreurs
  applicatives sont explicites.
- Les tests concernent l'environnement courant, pas un frontend nouvellement
  publié ni un hébergement Cloudflare.
- Les sauvegardes préalables à la migration sont conservées, mais une sauvegarde
  automatique et un historique restaurable ne sont pas inclus.
