---
name: Formulaire de rendez-vous
description: Fournisseur cible du formulaire et contraintes de validation de l’envoi pour ce site.
---

Pour ce site, l’utilisateur a choisi FormBold comme fournisseur principal pour les demandes de rendez-vous. L’endpoint FormBold est une URL publique de formulaire, pas un secret. L’utilisateur a confirmé qu’un test était visible dans le tableau de bord FormBold et dans la boîte du cabinet.

Web3Forms doit rester côté navigateur tant que le cabinet n’a pas d’offre payante et d’IP serveur autorisée. Sa clé navigateur `VITE_` est publique par conception. Un navigateur automatisé lancé depuis Replit peut sortir par l’IP serveur de Replit et être refusé, même si le code utilise `fetch` côté client.

**Why:** Le relais serveur et un essai automatisé depuis l’environnement Replit ont reçu HTTP 403. Un POST FormBold accepté avec HTTP 200 ne prouve pas à lui seul l’arrivée d’une notification; l’utilisateur a confirmé qu’un test fictif était visible dans FormBold et dans la boîte du cabinet.

**How to apply:** Conserver d’abord la demande dans Supabase, puis notifier via FormBold côté navigateur quand son endpoint est configuré; Web3Forms ne sert que de recours si l’endpoint est absent. Une panne de notification ne doit pas masquer une demande déjà sauvegardée ni provoquer un doublon : informer explicitement le visiteur. Après toute modification de l’endpoint ou des notifications, vérifier la soumission dans FormBold et le courriel reçu. Ne pas réactiver le relais serveur Web3Forms sans confirmer l’offre et la liste d’IP; ne pas conclure à un problème de domaine à partir d’un test serveur ou d’une requête OPTIONS lancée depuis Replit.

**Why:** L’utilisateur souhaite conserver les demandes dans Supabase tout en gardant le fournisseur d’e-mails choisi; la sauvegarde et la notification sont deux résultats distincts.
