---
name: Bundle Supabase Edge
description: Contraintes de bundling Deno et de contrat généré lors du déploiement de la fonction cabinet-api.
---

La fonction Edge du cabinet doit embarquer une copie Deno-compatible du contrat OpenAPI généré dans son propre dossier. Le script de synchronisation garde ce miroir à jour après le codegen. Les imports de paquets doivent utiliser une spécification `npm:` épinglée et les imports de fichiers locaux doivent inclure `.ts`.

**Why:** le bundler distant Supabase n’inclut pas les fichiers situés hors du dossier de la fonction; l’import Node nu et l’import relatif vers `lib/api-zod` échouaient. Le bundler local peut aussi échouer sur la résolution réseau du registre interne.

**How to apply:** après une modification OpenAPI, lancer `pnpm --filter @workspace/api-spec run codegen`. Avant un changement hébergé, demander une confirmation explicite; le déploiement distant de cette fonction a réussi avec le bundler API Supabase.
