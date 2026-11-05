---
name: Formulaire de rendez-vous
description: Fournisseur cible du formulaire et contraintes de validation de l’envoi pour ce site.
---

Pour ce site, l’utilisateur a choisi FormBold comme fournisseur cible pour les demandes de rendez-vous. Garder l’envoi Web3Forms côté navigateur tant que l’endpoint FormBold n’est pas configuré, afin d’éviter une interruption. L’endpoint FormBold est une URL publique de formulaire, pas un secret.

Web3Forms doit rester côté navigateur tant que le cabinet n’a pas d’offre payante et d’IP serveur autorisée. Sa clé navigateur `VITE_` est publique par conception. Un navigateur automatisé lancé depuis Replit peut sortir par l’IP serveur de Replit et être refusé, même si le code utilise `fetch` côté client.

**Why:** Le relais serveur et un essai automatisé depuis l’environnement Replit ont reçu HTTP 403. Un POST FormBold accepté avec HTTP 200 confirme seulement l’acceptation par l’endpoint, pas l’arrivée d’une notification dans la boîte du cabinet.

**How to apply:** Après un envoi fictif FormBold, vérifier la soumission dans le tableau de bord FormBold et le courriel dans la boîte du cabinet avant d’annoncer que la livraison complète est confirmée. Ne pas réactiver le relais serveur Web3Forms sans confirmer l’offre et la liste d’IP; ne pas conclure à un problème de domaine à partir d’un test serveur ou d’une requête OPTIONS lancée depuis Replit.
