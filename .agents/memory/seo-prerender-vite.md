---
name: Prérendu des routes Vite
description: Route resolution for generated static snapshots alongside a Vite SPA fallback.
---

Quand le build Vite génère des fichiers `index.html` sous des dossiers de routes, les URL canoniques et les liens de ces routes doivent inclure une barre oblique finale. Dans l’aperçu Vite, une URL sans barre oblique peut contourner le `index.html` du dossier et retomber sur le shell de la SPA.

**Why:** La première vérification des pages prérendues retournait correctement l’accueil pour les URL blog sans barre oblique, malgré la présence du fichier d’article dans le build.

**How to apply:** Aligner les liens publics, les routes du sitemap, les URL canoniques, les routes de test direct et les chemins de sortie du prérendu; vérifier les URL avec et sans barre oblique sur le serveur de prévisualisation. Pour les contrôles `data-seo-prerender`, tester le build avec `vite preview` plutôt que le serveur de développement et fournir `PORT` (par exemple `PORT=4173 BASE_PATH=/`).
