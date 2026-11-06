---
name: Vérification des fichiers statiques Cloudflare
description: Les réponses Pages peuvent omettre Content-Length même si un fichier statique est bien servi.
---

**Règle :** Pour vérifier qu’un fichier statique non vide est servi par Cloudflare Pages, lire le corps de la réponse et contrôler sa taille en octets; ne pas se fier uniquement à l’en-tête `Content-Length`.

**Why:** En production, `favicon.ico` était servi en HTTP 200 avec son contenu, mais Cloudflare n’envoyait pas `Content-Length`, ce qui faisait échouer à tort le smoke test.

**How to apply:** Dans les contrôles de ressources publiques, valider le statut et le type MIME, puis lire `response.arrayBuffer()` et vérifier que sa taille est supérieure à zéro.
