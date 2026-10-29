---
name: PostgreSQL local isolé
description: Détails du runtime local utiles pour tester des migrations PostgreSQL sans toucher à une base partagée.
---

Pour tester une migration de façon isolée, démarrer un cluster PostgreSQL temporaire plutôt que d’utiliser le serveur local partagé. Créer un répertoire socket et le passer avec `-k` au démarrage ; `initdb` crée par défaut le superutilisateur portant le nom du compte système courant, pas nécessairement `postgres`. Arrêter le cluster et supprimer son répertoire temporaire à la fin.

**Why:** Le serveur PostgreSQL partagé écoute déjà sur le port standard, et un cluster temporaire échoue sans socket explicite ou si le test se connecte avec un rôle bootstrap inexistant.

**How to apply:** Pour vérifier le comportement SQL d’une migration, lancer les tests de concurrence dans un cluster éphémère, créer uniquement les rôles nécessaires dans ce cluster et le supprimer même après un échec.
