---
name: Noms des contraintes PostgreSQL
description: Éviter les collisions entre les noms automatiques et explicites des contraintes CHECK.
---

PostgreSQL donne un nom prévisible comme `<table>_<colonne>_check` à une contrainte `CHECK` définie sans nom sur une colonne. Ne pas réutiliser ce nom pour une contrainte de table dans le même `CREATE TABLE`; donner à chaque contrainte explicite un nom distinct.

**Why:** une migration de production Supabase a été bloquée par un doublon de nom CHECK avant la création de la table des questions.

**How to apply:** lors de migrations qui combinent des `CHECK` de colonne et de table, vérifier les noms générés ou nommer explicitement chaque contrainte de façon unique avant le déploiement.
