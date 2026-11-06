# Vérification du site — 6 novembre 2026

## Rendez-vous et accès

Le formulaire enregistre d’abord une demande privée dans Supabase, avec un identifiant conservé en cas de nouvel essai. La notification FormBold est ensuite envoyée depuis le navigateur. Un échec de notification ne supprime pas la demande enregistrée.

Les tests API ont vérifié la validation des champs, le stockage, l’absence de doublon, le refus des accès anonymes, la consultation administrateur et la suppression du seul enregistrement fictif créé par le test.

Le test navigateur a confirmé l’enregistrement d’une demande fictive, sa présence dans `/arm` puis sa suppression. La notification FormBold a été interceptée pendant ce test pour ne pas envoyer de message externe. La session de test a été révoquée et son fichier temporaire supprimé.

## Contenu et traductions

Le contrat local et la fonction Supabase déployée doivent rester synchronisés. Une version ancienne éliminait les nouveaux champs anglais et les pages éditoriales sans faire échouer la publication. La fonction compatible a été déployée et le contenu administrable enrichi a été enregistré. Une nouvelle lecture a confirmé la conservation des champs.

Commande de contrôle, sans publication :

```sh
pnpm --filter @workspace/scripts exec tsx src/audit-cabinet-content.mjs
```

L’option `--apply` effectue une publication authentifiée et versionnée, après une sauvegarde du document public dans le dossier ignoré `generated-artifacts/site-audit`. Elle ne doit être employée que pour une modification approuvée. Le script refuse d’écraser un document modifié entre-temps.

Les vidéos francophones sont annoncées comme telles en anglais. Les dates et transcriptions manquantes ne sont pas inventées.

Un second défaut a été corrigé : les dates vidéo facultatives vides envoyées par les anciens clients d’administration sont maintenant traitées comme absentes. Les dates non vides invalides restent refusées. Un test de régression couvre les deux cas, la version obligatoire et la conservation du brouillon.

## Informations et confidentialité

Les coordonnées précédemment fournies par le cabinet sont conservées. La politique décrit maintenant le stockage Supabase, les notifications, l’accès administrateur, la suppression manuelle et les copies restant chez les prestataires ou dans la messagerie.

La durée de conservation reste décidée par l’administrateur, conformément au choix du cabinet. Cette configuration n’est pas une certification de conformité juridique : le cabinet doit valider sa politique, ses engagements contractuels, les durées appropriées, les transferts et les autorisations de publication.

## Audit automatisé mobile du site publié

Mesure Lighthouse avant publication des nouvelles optimisations :

| Catégorie | Score |
|---|---:|
| Performance | 56/100 |
| Accessibilité automatisée | 100/100 |
| Bonnes pratiques | 100/100 |
| SEO technique automatisé | 100/100 |

LCP : 4,8 s ; CLS : 0,428 ; blocage JavaScript total : 210 ms.

Principaux correctifs préparés : réservation des dimensions des images du HTML initial, contenu public initial immédiatement disponible avec actualisation réseau, chargement YouTube après interaction uniquement, noms accessibles des liens de marque cohérents avec leur texte visible.

Ces scores sont ceux de la version publiée mesurée, pas une promesse de résultat après modification. Les scores automatisés ne remplacent pas une vérification humaine de l’accessibilité, ni les données Core Web Vitals recueillies auprès des visiteurs réels. Les optimisations frontend doivent être publiées puis mesurées sur le domaine public.

## Google et publication

Un sitemap accepté dans Search Console ne garantit ni une date d’indexation ni un classement. Les modifications CMS deviennent accessibles au navigateur, puis le build Cloudflare doit réussir pour mettre à jour le HTML indexable. Google décide ensuite de la date de nouvelle exploration.

Les commits sur `main` déclenchent une publication Cloudflare. Un push constitue donc une mise en production et doit être traité comme tel.

La publication inchangée depuis le véritable `/arm` de production a été vérifiée : enregistrement HTTP 200, demande de régénération HTTP 200, puis déploiement Cloudflare `deploy_hook` terminé avec succès. Ce build utilise le code déjà présent sur `main` : les nouvelles optimisations frontend locales attendent encore leur push approuvé.

La compilation et le contrôle TypeScript passent. Le contrôle du build statique a validé 52 routes directes ; le sitemap contient 46 URL publiques. Les vues anglaises, le changement de langue, la confidentialité, le chargement vidéo après clic et l’absence de débordement horizontal sur mobile ont été contrôlés dans le navigateur.
