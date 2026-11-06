---
name: Schéma Supabase déployé et contenu CMS
description: Pourquoi une publication HTTP réussie ne suffit pas à valider de nouveaux champs CMS.
---

Après un ajout de champs au contrat CMS, vérifier que l’API Supabase déployée conserve ces champs lors d’un aller-retour administrateur et les restitue dans sa réponse publique.

**Why:** Une ancienne fonction déployée peut accepter une publication avec succès tout en supprimant les nouveaux champs facultatifs lors de sa validation. Les valeurs de secours du frontend masquent alors la perte des traductions ou du contenu administrable.

**How to apply:** Déployer le contrat et la fonction compatibles avant de publier les nouveaux champs. Contrôler le document réellement enregistré et sa réponse publique, pas seulement le statut HTTP ou l’affichage du navigateur.
