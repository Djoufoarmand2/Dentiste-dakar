import type { SiteContent } from '@workspace/api-client-react';

export const defaultWhyChooseContent: NonNullable<SiteContent['whyChoose']> = {
  eyebrow: 'Le cabinet · Douala',
  title: 'Votre sourire, notre attention à chaque étape.',
  intro: 'Choisir un cabinet, c’est aussi choisir la façon dont on vous accueille. Au Cabinet Sourire Serein, nous voulons que chaque échange soit clair, attentif et respectueux de votre rythme.',
  eyebrowEn: 'The practice · Douala',
  titleEn: 'Your smile, our care at every step.',
  introEn: 'Choosing a dental practice is also choosing how you will be welcomed. At Cabinet Sourire Serein, we want every conversation to feel clear, attentive and respectful of your pace.',
  valuesEyebrow: 'Notre manière de vous accompagner',
  valuesTitle: 'Des repères simples, dès le premier échange.',
  valuesEyebrowEn: 'How we support you',
  valuesTitleEn: 'A few clear things to expect from the first conversation.',
  values: [
    { id: 'listening', title: 'Être écouté', body: 'Vos questions, vos attentes et vos préoccupations ont leur place dans la conversation.', titleEn: 'A chance to be heard', bodyEn: 'Your questions, expectations and concerns all have a place in the conversation.' },
    { id: 'clear-information', title: 'Comprendre les soins', body: 'Les informations vous sont présentées avec des mots clairs afin que vous puissiez poser vos questions.', titleEn: 'Clear information', bodyEn: 'Information is shared in plain language so you can ask the questions that matter to you.' },
    { id: 'your-pace', title: 'Avancer à votre rythme', body: 'Vous pouvez échanger avec l’équipe et prendre le temps de comprendre les options proposées.', titleEn: 'At your own pace', bodyEn: 'You can talk things through with the team and take time to understand the options discussed.' },
  ],
  partnerEyebrow: 'Un environnement de soins',
  partnerTitle: 'Le Cabinet Sourire Serein, en lien avec la Clinique La Bienveillance.',
  partnerBody: 'Le cabinet dentaire vous accueille à Douala dans l’environnement de la Clinique La Bienveillance. Le cabinet et la clinique sont des repères distincts : pour toute question sur votre accueil ou votre venue, contactez-nous directement.',
  partnerEyebrowEn: 'A care setting',
  partnerTitleEn: 'Cabinet Sourire Serein, connected with Clinique La Bienveillance.',
  partnerBodyEn: 'The dental practice welcomes patients in Douala within the setting of Clinique La Bienveillance. The practice and clinic are distinct points of contact; if you have a question about your visit, please contact us directly.',
};

export const defaultPrivacyPolicyContent: NonNullable<SiteContent['privacyPolicy']> = {
  eyebrow: 'Vos informations',
  title: 'Confidentialité',
  description: 'Cette page décrit les données demandées par le site, les services utilisés et la suppression manuelle décidée par le cabinet. Les règles propres aux prestataires externes s’appliquent aussi à leurs systèmes.',
  eyebrowEn: 'Your information',
  titleEn: 'Privacy',
  descriptionEn: 'This page explains what information the website asks for, which services are used and how the practice handles deletion requests. External providers may apply their own rules to the data they process.',
  controllerName: 'Djoufo Armand',
  sections: [
    { id: 'data-handling', title: 'Gestion et suppression des données', body: 'Le cabinet décide de la suppression des avis et des demandes qu’il reçoit ; l’application ne leur applique pas de délai automatique. Les règles de conservation des prestataires externes doivent être vérifiées. Cette page donne une information générale et ne constitue pas un avis juridique.', titleEn: 'Data handling and deletion', bodyEn: 'The practice decides when to delete reviews and requests it receives; the application does not apply an automatic retention period. External providers may apply their own rules. This is general information, not legal advice.', required: true },
    { id: 'appointment-requests', title: 'Demandes de rendez-vous', body: 'Le formulaire recueille votre nom, téléphone, e-mail et soin souhaité pour permettre au cabinet de répondre à votre demande ; la date et le message sont facultatifs. La demande est enregistrée dans Supabase et accessible uniquement aux administrateurs autorisés. Aucun message automatique n’est envoyé par e-mail ou WhatsApp : l’équipe consulte la demande et vous recontacte manuellement selon vos préférences. L’envoi du formulaire ne confirme pas de créneau. N’indiquez pas de dossier médical, diagnostic, pièce d’identité ou autre information sensible dans le message.', titleEn: 'Appointment requests', bodyEn: 'The form collects your name, phone, email and requested service so the practice can respond; the preferred date and message are optional. Your request is stored in Supabase and can only be read by authorized administrators. No automatic email or WhatsApp message is sent: the team reviews the request and contacts you manually using your selected preference. Submitting the form does not confirm a time slot. Do not include medical records, diagnoses, identity documents or other sensitive information in the message.', required: true },
    { id: 'public-reviews', title: 'Avis publics', body: 'Le formulaire d’avis recueille un nom d’affichage, une note, un commentaire, un soin facultatif et l’autorisation de publication. Après envoi, l’avis est visible publiquement et peut être retiré par le cabinet. Évitez d’y inclure des informations médicales ou personnelles.', titleEn: 'Public reviews', bodyEn: 'The review form collects a display name, rating, comment, optional service and permission to publish. After submission, the review is visible publicly and can be removed by the practice. Do not include medical or other sensitive personal information.', required: true },
    { id: 'abuse-prevention', title: 'Protection contre les envois abusifs', body: 'Les formulaires d’avis et de rendez-vous utilisent une empreinte dérivée de l’adresse réseau pour limiter les envois répétés. Les empreintes de plus de 10 minutes sont supprimées lors d’une vérification ultérieure.', titleEn: 'Abuse prevention', bodyEn: 'Review and appointment forms use a fingerprint derived from network information to limit repeated submissions. Fingerprints older than 10 minutes are removed during a later cleanup.', required: true },
    { id: 'providers-and-media', title: 'Prestataires et contenus externes', body: 'Cloudflare héberge le site et traite les requêtes nécessaires à sa diffusion et à sa protection. Supabase conserve le contenu, les médias, les avis, les demandes et les sessions d’administration. Si l’équipe choisit de répondre manuellement depuis Gmail ou WhatsApp, Google ou Meta traite alors les coordonnées utilisées pour cette réponse selon ses propres règles. Aucune confirmation automatique n’est envoyée après un formulaire. Supprimer une demande dans l’administration ne supprime pas automatiquement les copies déjà présentes dans la boîte mail ou les systèmes des fournisseurs. Les vidéos YouTube et les cartes Google sont des contenus externes soumis aux règles de leurs fournisseurs. Des transferts hors du Cameroun peuvent avoir lieu selon leurs infrastructures ; le cabinet doit vérifier les contrats et garanties applicables. Les données de formulaire ne doivent pas être utilisées pour une prospection sans autorisation appropriée.', titleEn: 'Providers and external content', bodyEn: 'Cloudflare hosts and protects the website. Supabase stores content, media, reviews, requests and administrator sessions. If the team chooses to reply manually using Gmail or WhatsApp, Google or Meta processes the contact details used for that reply under its own rules. No automatic confirmation is sent after a form submission. Deleting a request in the admin does not automatically delete copies already stored in the mailbox or provider systems. YouTube videos and Google Maps are external content governed by their providers. Processing outside Cameroon may occur depending on their infrastructure; the practice should review applicable contracts and safeguards. Form data must not be used for marketing without appropriate authorization.', required: true },
    { id: 'retention-and-rights', title: 'Utilisation, conservation et demandes de données', body: 'Les avis sont enregistrés dans Supabase et restent visibles jusqu’à leur suppression par l’administrateur ; aucun effacement automatique n’est configuré. Le cabinet décide combien de temps conserver les demandes et les supprime manuellement. Les demandes d’accès ou de suppression peuvent être adressées aux coordonnées ci-dessous.', titleEn: 'Use, retention and data requests', bodyEn: 'Reviews are stored in Supabase and remain visible until an administrator removes them; no automatic deletion period is configured. The practice decides how long to keep requests and removes them manually. Requests to access or delete data can be sent to the contact details below.', required: true },
  ],
  contactTitle: 'Questions ou demande de suppression',
  contactIntro: 'Pour contacter le responsable du traitement, demander l’accès ou la suppression de données :',
  contactTitleEn: 'Questions or deletion requests',
  contactIntroEn: 'To contact the data controller or request access to or deletion of data:',
};
