# Publication Cloudflare du Cabinet Sourire Serein

## Configuration préparée

- Dépôt : https://github.com/Djoufoarmand2/Dentiste-dakar, branche `main`.
- Projet Pages : `cabinet-sourire-serein`.
- Répertoire racine : `/`.
- Commande : `pnpm --filter @workspace/cabinet-dentaire run build`.
- Sortie : `artifacts/cabinet-dentaire/dist/public`.
- Variables publiques de build configurées dans Cloudflare : `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_FORMBOLD_ENDPOINT`, `PORT=5173`,
  `BASE_PATH=/`, `NODE_VERSION=22`, `PNPM_VERSION`.
- `VITE_SITE_URL=https://dentiste-sourireserein.cm`.
- `VITE_SITE_INDEXABLE=false` jusqu’à validation du domaine et de HTTPS.
- Les secrets serveur Supabase restent exclusivement dans Supabase.

## Première publication

Les déploiements automatiques sont désactivés pour permettre un premier lancement
contrôlé. Dans Cloudflare : **Workers & Pages → cabinet-sourire-serein → Build →
Branch control**, l’utilisateur peut activer **Enable automatic production branch
deployments** pour que ses prochains commits sur `main` lancent la publication.
Pour publier directement le build déjà vérifié depuis le Shell, la méthode
documentée pour un projet Git dont les déploiements sont désactivés est :

```sh
pnpm dlx wrangler login
pnpm dlx wrangler pages deploy artifacts/cabinet-dentaire/dist/public --project-name=cabinet-sourire-serein --branch=main
```

Ces commandes de publication doivent être lancées par l’utilisateur. Vérifier le
succès du déploiement et ouvrir l’adresse `pages.dev` retournée par Cloudflare avant
toute bascule DNS. Le nom du projet seul ne prouve pas une publication réussie.

## Domaine

La zone Cloudflare contient des CNAME pour le domaine racine et `www`, vers le projet
Pages; les deux domaines ont été associés au projet.

Chez le registraire du domaine, remplacer les serveurs de noms Camoo par :

- `susan.ns.cloudflare.com`
- `weston.ns.cloudflare.com`

Ne pas mélanger anciens et nouveaux serveurs. Avant la bascule, exporter et vérifier
les autres enregistrements éventuels dans Camoo (messagerie, sous-domaines,
vérifications). Les consultations publiques initiales n’ont trouvé ni MX ni TXT à
la racine, mais elles ne permettent pas d’inventorier tous les sous-domaines.
Vérifier également la présence d’un ancien enregistrement DNSSEC DS au registraire :
il doit être retiré avant le changement de fournisseur, puis DNSSEC pourra être
réactivé dans Cloudflare avec les nouvelles valeurs.

Après propagation : vérifier que la zone est active, les deux domaines fonctionnent
en HTTPS, la connexion `/arm` fonctionne, le formulaire conserve les demandes dans
Supabase et FormBold notifie le cabinet. Activer ensuite `VITE_SITE_INDEXABLE=true`,
reconstruire et soumettre le sitemap à Google Search Console.

## Données de rendez-vous

La fonction Supabase enregistre d’abord les demandes dans `cabinet_appointments`.
Seule l’administration autorisée peut les consulter et les supprimer depuis `/arm`.
Le navigateur contacte ensuite FormBold pour la notification. Si cet envoi échoue,
le visiteur voit explicitement que sa demande reste enregistrée; aucun nouvel envoi
n’est nécessaire. Un identifiant de soumission évite les doublons en cas de nouvelle
tentative après une réponse réseau perdue. Le cabinet décide de la suppression
manuelle des demandes; la copie FormBold doit être gérée séparément.

## Vérifications reproductibles

- `pnpm --filter @workspace/cabinet-dentaire run typecheck`
- `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/cabinet-dentaire run build`
- `node scripts/src/test-cabinet-appointments.mjs api` (écrit puis supprime uniquement
  une demande fictive, ne contacte pas FormBold; utilise les secrets du workspace).
- Pour le smoke test, utiliser `CABINET_BASE_URL` vers une prévisualisation du build
  statique ou le site publié, pas vers le serveur Vite de développement.
