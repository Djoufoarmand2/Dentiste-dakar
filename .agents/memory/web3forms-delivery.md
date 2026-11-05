---
name: Envoi Web3Forms
description: Web3Forms delivery constraints and the chosen public-browser flow for this clinic site.
---

Pour ce site, l’envoi Web3Forms doit rester côté navigateur tant que le cabinet n’a pas d’offre payante et d’IP serveur autorisée par le fournisseur. La clé Web3Forms du navigateur est publique par conception; ne pas la présenter comme un secret.

**Why:** Le relais serveur a reçu un refus HTTP 403. La documentation officielle Web3Forms exige une offre payante et l’autorisation de l’IP serveur pour les envois côté serveur; la méthode navigateur est leur méthode gratuite habituelle.

**How to apply:** Ne pas réactiver le relais serveur sans confirmer l’offre et la liste d’IP. Si la méthode navigateur est utilisée, traiter toute clé `VITE_` comme publique et maintenir les protections anti-spam du formulaire.
