---
name: Clés serveur Supabase
description: Éviter les confusions entre clés publiques et privilégiées lors de la configuration directe de Supabase.
---

Pour une connexion serveur nécessitant des droits de stockage privilégiés, orienter la saisie sécurisée vers Settings → API Keys → Secret keys, plutôt que vers la clé publique proposée par Connect. Ne jamais consulter ou afficher la valeur du secret.

**Why:** Une simple demande de « clé Supabase » a entraîné plusieurs saisies sans les permissions nécessaires, malgré un secret présent et une URL valide.

**How to apply:** Lors d’une configuration ou d’un refus RLS, préciser le type de clé attendu et le projet correspondant. Ne pas désactiver RLS ni remplacer le stockage pour masquer le problème.

Pour gérer le schéma, les paramètres Auth et les Edge Functions, utiliser un jeton de gestion dont les permissions couvrent séparément ces opérations. Une clé serveur de projet ne remplace pas ce jeton.

**Why:** Un jeton limité à la base de données permettait les requêtes SQL mais bloquait encore le déploiement des fonctions et la configuration Auth ; redemander la même clé de projet ne résout pas ce refus.

**How to apply:** Vérifier chaque capacité nécessaire sans afficher le jeton, et demander uniquement les permissions manquantes. La présence du secret ou un succès SQL ne prouve pas les droits de gestion des autres services.
