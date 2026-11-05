---
name: Formulaire de rendez-vous
description: Fournisseur cible du formulaire et contraintes de validation de l’envoi pour ce site.
---

Pour ce site, l’utilisateur a choisi FormBold comme fournisseur cible pour les demandes de rendez-vous. Garder l’envoi Web3Forms côté navigateur tant que l’endpoint FormBold n’est pas configuré, afin d’éviter une interruption. L’endpoint FormBold est une URL publique de formulaire, pas un secret.

Web3Forms doit rester côté navigateur tant que le cabinet n’a pas d’offre payante et d’IP serveur autorisée. Sa clé navigateur `VITE_` est publique par conception. Un navigateur automatisé lancé depuis Replit peut sortir par l’IP serveur de Replit et être refusé, même si le code utilise `fetch` côté client.

**Why:** Le relais serveur et un essai automatisé depuis l’environnement Replit ont reçu HTTP 403. La migration vers FormBold a été demandée, mais la continuité du formulaire reste nécessaire jusqu’à la configuration de son endpoint.

**How to apply:** Quand l’endpoint FormBold est disponible, valider un envoi fictif depuis un navigateur et confirmer la réception dans la boîte du cabinet. Ne pas réactiver le relais serveur Web3Forms sans confirmer l’offre et la liste d’IP; ne pas conclure à un problème de domaine à partir d’un test serveur ou d’une requête OPTIONS lancée depuis Replit.
