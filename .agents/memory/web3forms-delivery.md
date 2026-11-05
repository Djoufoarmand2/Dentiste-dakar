---
name: Envoi Web3Forms
description: Web3Forms delivery constraints and the chosen public-browser flow for this clinic site.
---

Pour ce site, l’envoi Web3Forms doit rester côté navigateur tant que le cabinet n’a pas d’offre payante et d’IP serveur autorisée par le fournisseur. La clé Web3Forms du navigateur est publique par conception; ne pas la présenter comme un secret. Un navigateur automatisé lancé depuis Replit peut sortir par l’IP serveur de Replit et être refusé, même si le code utilise bien `fetch` côté client.

**Why:** Le relais serveur et un essai automatisé depuis l’environnement Replit ont reçu HTTP 403, avec un refus demandant l’usage côté client ou une IP autorisée sur l’offre Pro. Cela ne prouve pas qu’un visiteur depuis son propre navigateur sera refusé.

**How to apply:** Ne pas réactiver le relais serveur sans confirmer l’offre et la liste d’IP. Pour valider le flux gratuit, demander un essai synthétique depuis le navigateur réel du visiteur; ne pas conclure à un problème de domaine à partir d’un test serveur ou d’une requête OPTIONS lancée depuis Replit. Traiter toute clé `VITE_` comme publique et maintenir les protections anti-spam du formulaire.
