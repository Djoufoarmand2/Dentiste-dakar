---
name: Domaine public
description: Domaine choisi et hébergement cible du site public.
---

Le domaine public choisi par l’utilisateur est `dentiste-sourireserein.cm`. L’utilisateur a confirmé l’achat du domaine chez Camoo.

L’utilisateur a choisi Cloudflare comme hébergeur et gestionnaire DNS. Pour ce site Vite statique, Cloudflare Pages relié au dépôt GitHub est la cible.

La zone a été créée dans le compte Cloudflare connecté. Les serveurs de noms attribués sont `susan.ns.cloudflare.com` et `weston.ns.cloudflare.com`. Le projet Pages `cabinet-sourire-serein` est configuré avec le dépôt GitHub demandé et des CNAME racine/www vers son sous-domaine Pages. La création du projet ne prouve pas que le site est publié. Distinguer le déploiement Pages de l’activation du domaine personnalisé.

**Why:** La création d’une zone Cloudflare ne remplace pas la délégation au registraire. Le sous-domaine Pages peut fonctionner alors que le domaine personnalisé utilise encore l’ancien hébergement et son certificat.

**How to apply:** Vérifier le premier déploiement Pages, puis faire remplacer les serveurs de noms chez le registraire par la paire Cloudflare attribuée après inventaire des enregistrements et vérification DNSSEC. Ne configurer l’indexation qu’après validation HTTPS sur le domaine. Consulter l’état réel du compte avant de déclarer une zone active ou un déploiement réussi.
