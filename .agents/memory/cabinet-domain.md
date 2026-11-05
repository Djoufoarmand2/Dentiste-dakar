---
name: Domaine public
description: Domaine choisi et hébergement cible du site public.
---

Le domaine public choisi par l’utilisateur est `dentiste-sourireserein.cm`.

L’utilisateur a choisi Cloudflare comme hébergeur et gestionnaire DNS. Pour ce site Vite statique, Cloudflare Pages relié au dépôt GitHub est la cible.

La zone a été créée dans le compte Cloudflare connecté. Les serveurs de noms attribués sont `susan.ns.cloudflare.com` et `weston.ns.cloudflare.com`. Le projet Pages `cabinet-sourire-serein` est configuré avec le dépôt GitHub demandé et des CNAME racine/www vers son sous-domaine Pages. Les déploiements automatiques sont désactivés en attente du premier lancement par l’utilisateur. La création du projet ne prouve pas que le site est publié.

**Why:** Le 5 novembre 2026, l’utilisateur a confirmé la création de la zone dans Cloudflare. La vérification publique montre que le domaine reste actuellement délégué à Camoo.

**How to apply:** Vérifier le premier déploiement Pages, puis faire remplacer les serveurs de noms chez le registraire par la paire Cloudflare attribuée après inventaire des enregistrements et vérification DNSSEC. Ne configurer l’indexation qu’après validation HTTPS sur le domaine. Consulter l’état réel du compte avant de déclarer une zone active ou un déploiement réussi.
