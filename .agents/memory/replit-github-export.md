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

Après une rebase automatique du projet sur `main-repl/main`, les refs locales et GitHub peuvent diverger à nouveau alors que leurs arbres sont identiques. Comparer le contenu et la ref distante avant toute nouvelle poussée; ne pas créer un commit de fusion sans changement de fichiers si une poussée peut déclencher une publication.

**Why:** La rebase de fin de tâche a réécrit la filiation locale sans modifier l’arborescence déjà publiée; une poussée de rapprochement aurait ajouté un commit sans changement de contenu et pouvait relancer la publication.

**How to apply:** Après la rebase, comparer `HEAD` à `origin/main` avec `git diff --quiet` et vérifier `git ls-remote`. Si l’arbre distant correspond déjà à la version approuvée, conserver le pointeur distant vérifié plutôt que pousser uniquement pour aligner l’historique.
