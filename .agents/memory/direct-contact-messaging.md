---
name: Demandes sans automatisation
description: Règle actuelle du cabinet pour enregistrer les demandes et répondre manuellement.
---

Les formulaires publics enregistrent les demandes dans Supabase et les transmettent aussi à FormBold, sans réponse automatique Gmail ni WhatsApp au patient. FormBold peut traiter et conserver une copie selon sa configuration. Les liens de contact e-mail et WhatsApp restent visibles pour que visiteurs et administrateurs puissent initier eux-mêmes une conversation. L’administrateur conserve la boîte privée, l’historique et les liens de réponse manuelle après vérification des coordonnées. Conserver les préférences de contact et le consentement WhatsApp utiles à cette réponse. Ne pas supprimer les demandes existantes, les colonnes historiques ou les migrations déjà appliquées.

**Why:** le 8 novembre 2026, l’utilisateur a demandé l’abandon des envois automatiques Gmail/WhatsApp, puis a demandé que les soumissions soient aussi relayées à FormBold tout en conservant l’historique Supabase et les réponses manuelles.

**How to apply:** garder Supabase comme boîte admin de référence et FormBold comme canal secondaire de transmission; ne pas réintroduire d’envoi direct Gmail/WhatsApp au patient sans nouvelle demande explicite.
