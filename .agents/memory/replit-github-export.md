---
name: Export GitHub depuis Replit
description: Vérifications utiles avant de publier un instantané du workspace vers un dépôt GitHub.
---

**Règle :** Avant toute écriture, vérifie que le remote Git effectif correspond exactement au propriétaire et au dépôt demandés, et consulte les refs distantes. Une sélection dans l’interface Git de Replit peut laisser le remote sur un autre dépôt. Pour un dépôt public vide, demander confirmation de visibilité et préférer un commit racine de l’arborescence actuelle afin de ne pas exposer l’historique local.

**Why:** Le remote sélectionné dans Replit a pointé vers un dépôt différent du lien explicite fourni; une simulation d’envoi a permis de le repérer avant toute écriture.

**How to apply:** Contrôler `git remote get-url origin` et `git ls-remote origin` avant de pousser. Comparer l’URL à la cible donnée par l’utilisateur, surtout après une sélection dans l’interface Replit.

Quand l’historique des checkpoints locaux et celui du dépôt exporté sont indépendants mais leurs arborescences compatibles, publier un instantané comme nouveau commit enfant du `main` distant permet de préserver l’historique distant sans fusion ni push forcé. Comparer les arbres, pas seulement le nombre de commits divergents.

**Why:** Un export racine rend les historiques divergents même lorsque les fichiers correspondent presque exactement; fusionner tous les checkpoints locaux n’est pas nécessaire pour publier les corrections.

**How to apply:** Utiliser un index Git temporaire initialisé depuis le `main` distant, y préparer l’arborescence courante, examiner le diff et pousser uniquement le nouveau commit enfant. Préserver la branche locale de checkpoints.
