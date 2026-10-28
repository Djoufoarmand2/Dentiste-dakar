---
name: Clés serveur Supabase
description: Éviter les confusions entre clés publiques et privilégiées lors de la configuration directe de Supabase.
---

Pour une connexion serveur nécessitant des droits de stockage privilégiés, orienter la saisie sécurisée vers Settings → API Keys → Secret keys, plutôt que vers la clé publique proposée par Connect. Ne jamais consulter ou afficher la valeur du secret.

**Why:** Une simple demande de « clé Supabase » a entraîné plusieurs saisies sans les permissions nécessaires, malgré un secret présent et une URL valide.

**How to apply:** Lors d’une configuration ou d’un refus RLS, préciser le type de clé attendu et le projet correspondant. Ne pas désactiver RLS ni remplacer le stockage pour masquer le problème.
