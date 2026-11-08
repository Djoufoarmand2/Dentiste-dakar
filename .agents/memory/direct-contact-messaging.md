---
name: Envoi direct des formulaires
description: Choix durable du cabinet pour confirmer les demandes après leur sauvegarde.
---

Les formulaires publics doivent d’abord enregistrer la demande dans Supabase, puis appeler directement l’API Gmail et/ou l’API WhatsApp Business officielle depuis la fonction Supabase. Ne pas remettre FormBold, Web3Forms, Make ou un webhook d’automatisation dans ce parcours. Les secrets des fournisseurs restent uniquement dans les secrets des fonctions Supabase. L’administrateur valide chaque canal avant activation. Une erreur de notification ne doit pas effacer une demande enregistrée ni provoquer un faux succès d’envoi.

**Why:** l’utilisateur a explicitement demandé que l’envoi parte directement après la logique métier du formulaire, sans outil d’automatisation externe.

**How to apply:** utiliser ce parcours pour les demandes de rendez-vous et les questions rapides; conserver les statuts e-mail et WhatsApp séparés et exiger le consentement avant tout message WhatsApp.
