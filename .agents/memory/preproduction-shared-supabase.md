---
name: Préproduction et données Supabase
description: La préproduction et l’aperçu utilisent le même projet Supabase que la production.
---

Ne pas créer, modifier ou supprimer des données métier pendant les tests sur l’aperçu sans accord explicite. Les formulaires de test peuvent aussi déclencher des notifications réelles.

**Why:** L’utilisateur a indiqué qu’il n’existe pas de projet Supabase distinct pour les tests et qu’il utilisera l’aperçu.

**How to apply:** Privilégier les vérifications en lecture seule et les tests locaux avec données fictives. Prévenir l’utilisateur et demander son accord avant tout envoi de formulaire ou modification du CMS depuis l’aperçu.
