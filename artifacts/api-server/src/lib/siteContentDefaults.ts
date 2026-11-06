import { GetSiteContentResponse } from "@workspace/api-zod";

export const defaultSiteContent = GetSiteContentResponse.parse({
  clinic: {
    name: "Cabinet Sourire Serein",
    city: "Douala",
    address: "Bonanjo, Douala, Cameroun",
    phone: "+237 6 70 00 00 00",
    email: "contact@cabinet-naya.example",
    openingHours: "Lundi au vendredi · 16h–19h (sur rendez-vous)\nSamedi · 10h–14h (sur rendez-vous)",
    openingHoursEn: "Monday to Friday · 4:00–7:00 pm (by appointment)\nSaturday · 10:00 am–2:00 pm (by appointment)",
    bookingUrl: "mailto:contact@cabinet-naya.example",
    mapUrl: "",
    logoUrl: "",
  },
  hero: {
    eyebrow: "Un cabinet à votre écoute",
    title: "Prenez soin de votre sourire, en toute sérénité.",
    description:
      "Des soins dentaires attentifs, des explications claires et un accompagnement adapté à chacun.",
    primaryAction: "Prendre rendez-vous",
    secondaryAction: "Découvrir nos soins",
    imageUrl: "",
    eyebrowEn: "A dental practice that listens",
    titleEn: "Care for your smile, with confidence.",
    descriptionEn:
      "Attentive dental care, clear explanations and an approach shaped around each person.",
    primaryActionEn: "Request an appointment",
    secondaryActionEn: "Explore our services",
  },
  whyChoose: {
    eyebrow: "Le cabinet · Douala",
    title: "Votre sourire, notre attention à chaque étape.",
    intro:
      "Choisir un cabinet, c’est aussi choisir la façon dont on vous accueille. Au Cabinet Sourire Serein, nous voulons que chaque échange soit clair, attentif et respectueux de votre rythme.",
    eyebrowEn: "The practice · Douala",
    titleEn: "Your smile, our care at every step.",
    introEn:
      "Choosing a dental practice is also choosing how you will be welcomed. At Cabinet Sourire Serein, we want every conversation to feel clear, attentive and respectful of your pace.",
    valuesEyebrow: "Notre manière de vous accompagner",
    valuesTitle: "Des repères simples, dès le premier échange.",
    valuesEyebrowEn: "How we support you",
    valuesTitleEn: "A few clear things to expect from the first conversation.",
    values: [
      {
        id: "listening",
        title: "Être écouté",
        body: "Vos questions, vos attentes et vos préoccupations ont leur place dans la conversation.",
        titleEn: "A chance to be heard",
        bodyEn: "Your questions, expectations and concerns all have a place in the conversation.",
      },
      {
        id: "clear-information",
        title: "Comprendre les soins",
        body: "Les informations vous sont présentées avec des mots clairs afin que vous puissiez poser vos questions.",
        titleEn: "Clear information",
        bodyEn: "Information is shared in plain language so you can ask the questions that matter to you.",
      },
      {
        id: "your-pace",
        title: "Avancer à votre rythme",
        body: "Vous pouvez échanger avec l’équipe et prendre le temps de comprendre les options proposées.",
        titleEn: "At your own pace",
        bodyEn: "You can talk things through with the team and take time to understand the options discussed.",
      },
    ],
    partnerEyebrow: "Un environnement de soins",
    partnerTitle: "Le Cabinet Sourire Serein, en lien avec la Clinique La Bienveillance.",
    partnerBody:
      "Le cabinet dentaire vous accueille à Douala dans l’environnement de la Clinique La Bienveillance. Le cabinet et la clinique sont des repères distincts : pour toute question sur votre accueil ou votre venue, contactez-nous directement.",
    partnerEyebrowEn: "A care setting",
    partnerTitleEn: "Cabinet Sourire Serein, connected with Clinique La Bienveillance.",
    partnerBodyEn:
      "The dental practice welcomes patients in Douala within the setting of Clinique La Bienveillance. The practice and clinic are distinct points of contact; if you have a question about your visit, please contact us directly.",
  },
  privacyPolicy: {
    eyebrow: "Vos informations",
    title: "Confidentialité",
    description:
      "Cette page décrit les données demandées par le site, les services utilisés et la suppression manuelle décidée par le cabinet. Les règles propres aux prestataires externes s’appliquent aussi à leurs systèmes.",
    eyebrowEn: "Your information",
    titleEn: "Privacy",
    descriptionEn:
      "This page explains what information the website asks for, which services are used and how the practice handles deletion requests. External providers may apply their own rules to the data they process.",
    controllerName: "Djoufo Armand",
    sections: [
      {
        id: "data-handling",
        title: "Gestion et suppression des données",
        body: "Le cabinet décide de la suppression des avis et des demandes qu’il reçoit ; l’application ne leur applique pas de délai automatique. Les règles de conservation des prestataires externes doivent être vérifiées. Cette page donne une information générale et ne constitue pas un avis juridique.",
        titleEn: "Data handling and deletion",
        bodyEn:
          "The practice decides when to delete reviews and requests it receives; the application does not apply an automatic retention period. External providers may apply their own rules. This is general information, not legal advice.",
        required: true,
      },
      {
        id: "appointment-requests",
        title: "Demandes de rendez-vous",
        body: "Le formulaire demande un nom, un numéro de téléphone, une adresse e-mail et un soin souhaité ; la date, la plage horaire souhaitée et le message sont facultatifs. La plage sélectionnée exprime une préférence et ne réserve pas un rendez-vous. Les demandes sont conservées dans Supabase et une notification peut être envoyée par le prestataire configuré. Évitez d’indiquer des informations médicales sensibles.",
        titleEn: "Appointment requests",
        bodyEn:
          "The form asks for your name, phone number, email address and the service you are interested in; the preferred date, opening period and message are optional. The selected period is a preference and does not reserve an appointment. Requests are stored in Supabase and a notification may be sent through the configured provider. Please avoid sensitive medical details.",
        required: true,
      },
      {
        id: "public-reviews",
        title: "Avis publics",
        body: "Le formulaire d’avis recueille un nom d’affichage, une note, un commentaire, un soin facultatif et l’autorisation de publication. Après envoi, l’avis est visible publiquement et peut être retiré par le cabinet. Évitez d’y inclure des informations médicales ou personnelles.",
        titleEn: "Public reviews",
        bodyEn:
          "The review form collects a display name, rating, comment, optional service and permission to publish. After submission, the review is visible publicly and can be removed by the practice. Do not include medical or other sensitive personal information.",
        required: true,
      },
      {
        id: "abuse-prevention",
        title: "Protection contre les envois abusifs",
        body: "Le service d’avis utilise une empreinte dérivée de l’adresse réseau pour limiter les envois répétés. Les empreintes de plus de 10 minutes sont supprimées lors d’une vérification ultérieure.",
        titleEn: "Abuse prevention",
        bodyEn:
          "The review service uses a fingerprint derived from network information to limit repeated submissions. Fingerprints older than 10 minutes are removed during a later cleanup.",
        required: true,
      },
      {
        id: "retention-and-rights",
        title: "Utilisation, conservation et demandes de données",
        body: "Les avis sont enregistrés dans Supabase et restent visibles jusqu’à leur suppression par l’administrateur ; aucun effacement automatique n’est configuré. Le cabinet décide combien de temps conserver les demandes et les supprime manuellement. Les demandes d’accès ou de suppression peuvent être adressées aux coordonnées ci-dessous.",
        titleEn: "Use, retention and data requests",
        bodyEn:
          "Reviews are stored in Supabase and remain visible until an administrator removes them; no automatic deletion period is configured. The practice decides how long to keep requests and removes them manually. Requests to access or delete data can be sent to the contact details below.",
        required: true,
      },
    ],
    contactTitle: "Questions ou demande de suppression",
    contactIntro:
      "Pour contacter le responsable du traitement, demander l’accès ou la suppression de données :",
    contactTitleEn: "Questions or deletion requests",
    contactIntroEn:
      "To contact the data controller or request access to or deletion of data:",
  },
  services: [
    {
      id: "soin-preventif",
      title: "Prévention & contrôle",
      slug: "prevention",
      summary: "Un suivi régulier pour prendre soin de votre santé bucco-dentaire.",
      description:
        "Bilan, conseils d'hygiène et accompagnement personnalisé. Exemple de contenu à valider par le praticien.",
      imageUrl: "",
      titleEn: "Preventive care and check-ups",
      slugEn: "preventive-care",
      summaryEn: "A dental check-up can help you discuss your oral health and questions with a practitioner.",
      descriptionEn:
        "A visit may include a conversation about your concerns, an examination if appropriate, and an explanation of possible next steps. The practitioner will tailor advice to your situation.",
      purpose: "Ce rendez-vous permet d’échanger sur votre santé bucco-dentaire et de poser vos questions à un praticien.",
      purposeEn: "This visit gives you time to discuss your oral health and ask a dental professional questions.",
      procedureSteps: "Prise de contact et présentation de votre demande.\nÉchange sur vos questions et informations de santé utiles.\nExamen, si le praticien le juge indiqué et avec votre accord.\nExplication des observations et des options possibles.\nDécision partagée sur la suite, sans engagement avant d’avoir compris la proposition.",
      procedureStepsEn: "Contact the practice and explain what you would like help with.\nDiscuss your questions and any relevant health information.\nAn examination may be offered if the practitioner considers it appropriate and you agree.\nThe practitioner explains their observations and any options.\nYou can discuss next steps together; you do not need to decide before you understand the proposal.",
      imageAlt: "Illustration générique d’une consultation de prévention dentaire.",
      imageAltEn: "Illustration of a general preventive dental consultation.",
    },
    {
      id: "soin-esthetique",
      title: "Esthétique du sourire",
      slug: "esthetique",
      summary: "Des solutions adaptées à vos envies et à votre situation.",
      description:
        "Chaque prise en charge commence par un échange et une évaluation individuelle avec le praticien.",
      imageUrl: "",
      titleEn: "Smile aesthetics",
      slugEn: "smile-aesthetics",
      summaryEn: "Discuss your goals and learn which options may be suitable for your individual situation.",
      descriptionEn:
        "Aesthetic dental options vary from person to person. A practitioner can discuss your expectations, examine your oral health when appropriate, and explain possible choices, limitations and follow-up.",
      purpose: "Un échange avec le praticien aide à préciser vos attentes et à comprendre les options envisageables pour votre situation.",
      purposeEn: "A conversation with a practitioner helps clarify your goals and explain which options may be appropriate for you.",
      procedureSteps: "Vous décrivez ce que vous souhaitez améliorer et vos attentes.\nLe praticien recueille les informations utiles et examine votre situation, si cela est indiqué.\nLes options possibles, leurs limites et les étapes prévues vous sont expliquées.\nVous posez vos questions et choisissez librement la suite avec le praticien.\nUn suivi est discuté selon l’option retenue.",
      procedureStepsEn: "You describe what you would like to change and what you expect.\nThe practitioner gathers relevant information and examines your situation if appropriate.\nPossible options, their limits and the expected steps are explained.\nYou can ask questions and decide freely with the practitioner how to proceed.\nAny follow-up is discussed according to the option chosen.",
      imageAlt: "Illustration générique de soins dentaires esthétiques.",
      imageAltEn: "Illustration of general aesthetic dental care.",
    },
    {
      id: "soin-orthodontie",
      title: "Orthodontie",
      slug: "orthodontie",
      summary: "Un accompagnement personnalisé à chaque étape du traitement.",
      description:
        "Les possibilités de traitement sont déterminées après un examen et un diagnostic personnalisés.",
      imageUrl: "",
      titleEn: "Orthodontics",
      slugEn: "orthodontics",
      summaryEn: "Learn about orthodontic options through an individual assessment and discussion with a practitioner.",
      descriptionEn:
        "Orthodontic care aims to address the position of teeth and jaws. The suitable options, expected duration and follow-up depend on an individual assessment by a qualified practitioner.",
      purpose: "L’orthodontie vise à corriger certaines positions dentaires ou relations entre les mâchoires. Les possibilités dépendent d’une évaluation individuelle.",
      purposeEn: "Orthodontics aims to address certain tooth positions or relationships between the jaws. Options depend on an individual assessment.",
      procedureSteps: "Vous échangez avec le cabinet sur votre demande et la prise de rendez-vous.\nLe praticien vous pose des questions sur votre situation et examine votre bouche.\nDes examens complémentaires peuvent être proposés si nécessaire et expliqués avant leur réalisation.\nLe praticien vous présente les options, les limites, le suivi et les éléments à discuter.\nVous décidez avec le praticien des prochaines étapes après avoir obtenu les explications nécessaires.",
      procedureStepsEn: "Contact the practice and arrange a visit to discuss your concerns.\nThe practitioner asks about your situation and examines your mouth.\nFurther assessments may be suggested if needed and explained before they take place.\nThe practitioner discusses options, limitations, follow-up and points to consider.\nAfter you have the information you need, you can decide together on possible next steps.",
      imageAlt: "Illustration générique de soins orthodontiques.",
      imageAltEn: "Illustration of general orthodontic care.",
    },
  ],
  team: [
    {
      id: "dr-naya",
      name: "Dr Amélie Naya",
      role: "Chirurgienne-dentiste",
      biography: "Présentation fictive à remplacer par les informations vérifiées du cabinet.",
      imageUrl: "",
      roleEn: "Dental surgeon",
      biographyEn: "Sample profile text. Replace this with information verified by the practice before publication.",
    },
  ],
  gallery: [
    { id: "cabinet-1", alt: "Espace d'accueil du cabinet", imageUrl: "", altEn: "Reception area of the practice." },
    { id: "cabinet-2", alt: "Salle de soins", imageUrl: "", altEn: "Dental treatment room." },
    { id: "cabinet-3", alt: "Équipe du cabinet", imageUrl: "", altEn: "Dental practice team." },
  ],
  testimonials: [
    {
      id: "avis-demo-1",
      name: "Marie D. · exemple",
      service: "Visite de contrôle",
      quote:
        "Avis de démonstration fictif. Remplacez-le par un témoignage authentique avec l'accord de la personne.",
      rating: 5,
      serviceEn: "Dental check-up",
      quoteEn: "",
    },
    {
      id: "avis-demo-2",
      name: "Jean K. · exemple",
      service: "Première consultation",
      quote:
        "Avis de démonstration fictif. Remplacez-le par un témoignage authentique avec l'accord de la personne.",
      rating: 5,
      serviceEn: "First consultation",
      quoteEn: "",
    },
  ],
  faqs: [
    {
      id: "faq-rendez-vous",
      question: "Comment prendre rendez-vous ?",
      answer:
        "Contactez le cabinet par téléphone ou utilisez le lien de rendez-vous. Les coordonnées de démonstration sont à remplacer.",
      questionEn: "How can I request an appointment?",
      answerEn: "Contact the practice by phone or use the appointment link. Sample contact details must be replaced with verified information.",
    },
    {
      id: "faq-premiere-visite",
      question: "Que prévoir pour une première visite ?",
      answer:
        "Apportez vos informations de santé et vos éventuels examens récents. Le praticien vous indiquera les éléments utiles selon votre situation.",
      questionEn: "What should I bring to a first visit?",
      answerEn: "Bring relevant health information and any recent examinations you have. The practitioner can tell you what is useful for your situation.",
    },
    {
      id: "faq-enfants",
      question: "Le cabinet reçoit-il les enfants ?",
      answer:
        "Les modalités d'accueil sont à confirmer directement avec le cabinet avant publication.",
      questionEn: "Does the practice see children?",
      answerEn: "Please confirm the practice's arrangements for children directly before publication.",
    },
  ],
  blogPosts: [
    {
      id: "conseils-hygiene",
      title: "Les gestes simples pour prendre soin de ses dents",
      slug: "gestes-simples-hygiene-dentaire",
      excerpt:
        "Quelques habitudes quotidiennes peuvent contribuer à une bonne hygiène bucco-dentaire.",
      content:
        "Prendre soin de sa bouche repose sur des gestes réguliers, adaptés à chaque personne. Ces repères sont généraux et ne remplacent pas les conseils d’un professionnel qui connaît votre situation.\n\n## Un brossage régulier et attentif\nLe NHS recommande de se brosser les dents deux fois par jour pendant environ deux minutes avec un dentifrice fluoré. Prenez le temps de nettoyer les différentes faces des dents. Une brosse manuelle ou électrique peut convenir si le brossage est réalisé soigneusement; un professionnel peut vous aider à choisir ce qui vous convient.\n\n## Nettoyer entre les dents\nLa brosse ne passe pas partout. Le fil dentaire ou une brossette interdentaire adaptée peut aider à nettoyer entre les dents. Demandez conseil au cabinet pour choisir un outil et apprendre à l’utiliser sans irriter les gencives.\n\n## Penser aux habitudes du quotidien\nLa fréquence des prises d’aliments et boissons sucrés compte pour la santé bucco-dentaire. Le CDC recommande également une bonne hygiène quotidienne et des échanges avec un professionnel selon les besoins. Si vous fumez, avez la bouche sèche, êtes enceinte ou suivez un traitement médical, signalez-le au professionnel afin qu’il adapte ses conseils.\n\n## Trouver des gestes adaptés\nLa sensibilité, les appareils dentaires, les prothèses, l’âge et certains problèmes de santé peuvent modifier les besoins. Ne forcez pas un geste douloureux et n’utilisez pas un outil qui blesse vos gencives. Le praticien peut vous montrer les gestes adaptés à votre bouche.\n\n## Quand demander conseil ?\nUne douleur, un saignement persistant, une gêne nouvelle ou une lésion qui ne guérit pas mérite un échange avec un professionnel. En cas de douleur importante ou de gonflement, contactez un professionnel de santé pour savoir comment agir rapidement.\n\nCes informations sont générales et ne constituent pas un diagnostic. La fréquence des contrôles et les conseils d’hygiène dépendent de chaque personne.\n\n## Sources\nNHS, How to keep your teeth clean: https://www.nhs.uk/live-well/healthy-teeth-and-gums/how-to-keep-your-teeth-clean/\nCDC, Oral Health Tips for Adults: https://www.cdc.gov/oral-health/prevention/oral-health-tips-for-adults.html",
      imageUrl: "",
      author: "Équipe du cabinet",
      date: "2026-10-01",
      published: true,
      titleEn: "Simple daily habits for a healthier mouth",
      slugEn: "daily-habits-for-oral-health",
      excerptEn: "Regular, suitable daily habits can support oral health. Learn what to discuss with your dental professional.",
      contentEn:
        "Looking after your mouth involves regular habits that can be adapted to each person. These are general pointers, not a substitute for advice from a professional who knows your situation.\n\n## Brush regularly and carefully\nThe NHS advises brushing twice a day for about two minutes with fluoride toothpaste. Take time to clean the different surfaces of your teeth. A manual or electric toothbrush can work when used carefully; a dental professional can help you choose what suits you.\n\n## Clean between your teeth\nA toothbrush cannot reach every space. Dental floss or a suitably sized interdental brush can help clean between teeth. Ask the practice which tool may suit you and how to use it without irritating your gums.\n\n## Consider everyday habits\nHow often you have foods and drinks containing sugar matters for oral health. The CDC also recommends daily oral hygiene and discussing your needs with a professional. If you smoke, have a dry mouth, are pregnant or take medication, tell your clinician so they can tailor their advice.\n\n## Choose habits that fit your needs\nSensitivity, dental appliances, dentures, age and some health conditions can affect what is suitable. Do not force a painful movement or use a tool that injures your gums. A practitioner can demonstrate approaches suited to your mouth.\n\n## When should I ask for advice?\nPain, persistent bleeding, new discomfort or a sore that does not heal are reasons to speak with a professional. If you have significant pain or swelling, contact a health professional promptly for advice.\n\nThis information is general and is not a diagnosis. The right check-up schedule and oral care advice vary from person to person.\n\n## Sources\nNHS, How to keep your teeth clean: https://www.nhs.uk/live-well/healthy-teeth-and-gums/how-to-keep-your-teeth-clean/\nCDC, Oral Health Tips for Adults: https://www.cdc.gov/oral-health/prevention/oral-health-tips-for-adults.html",
      authorEn: "Practice team",
      imageAlt: "Illustration of routine dental hygiene and tooth brushing.",
      imageAltEn: "Illustration of routine dental hygiene and tooth brushing.",
    },
    {
      id: "visite-controle",
      title: "Pourquoi prévoir un suivi dentaire régulier ?",
      slug: "suivi-dentaire-regulier",
      excerpt:
        "Le suivi permet de faire le point avec un professionnel et de poser vos questions.",
      content:
        "Un rendez-vous de suivi est l’occasion de parler de votre santé bucco-dentaire avec un professionnel et de poser vos questions. La fréquence utile n’est pas identique pour tout le monde : elle dépend notamment de vos besoins et des recommandations du praticien.\n\n## Que peut-on aborder ?\nVous pouvez expliquer ce qui vous gêne, signaler une douleur, une sensibilité, un saignement ou un changement récent. Pensez aussi à mentionner vos traitements et les éléments de santé qui peuvent être utiles à la consultation.\n\n## Comment se déroule l’échange ?\nLe professionnel vous écoute et peut examiner votre bouche selon la situation et votre accord. Il vous explique ce qu’il observe, répond à vos questions et discute avec vous des prochaines étapes possibles. Un examen complémentaire ou un soin n’est proposé que si le professionnel le juge indiqué et vous en explique l’objectif.\n\n## À quelle fréquence revenir ?\nIl n’existe pas une fréquence unique adaptée à toutes les personnes. Le praticien peut proposer un calendrier en fonction de l’examen, de vos antécédents et de vos besoins. Si vos symptômes changent entre deux visites, contactez le cabinet plutôt que d’attendre le prochain contrôle.\n\n## Préparer votre rendez-vous\nNotez vos questions, apportez les informations de santé pertinentes et signalez toute inquiétude. Vous pouvez demander que les explications soient reprises ou reformulées avant de décider de la suite.\n\nCet article apporte des informations générales et ne remplace pas une consultation. Les consignes précises sont à confirmer avec un professionnel de santé.",
      imageUrl: "",
      author: "Équipe du cabinet",
      date: "2026-09-18",
      published: true,
      titleEn: "Why regular dental follow-up matters",
      slugEn: "regular-dental-follow-up",
      excerptEn: "A follow-up visit is a chance to review your oral health and discuss questions with a professional.",
      contentEn:
        "A follow-up appointment gives you a chance to discuss your oral health with a professional and ask questions. The useful interval is not the same for everyone; it depends on your needs and the practitioner’s recommendations.\n\n## What can you discuss?\nExplain what is bothering you and mention pain, sensitivity, bleeding or a recent change. Tell the practitioner about medication and health information that may be relevant to the visit.\n\n## What may happen during the conversation?\nThe professional listens and may examine your mouth depending on your situation and your agreement. They explain what they observe, answer questions and discuss possible next steps with you. Further assessment or care should be proposed only when the professional considers it appropriate and has explained its purpose.\n\n## How often should I return?\nThere is no single schedule that fits everyone. A practitioner can suggest a plan based on an examination, your history and your needs. If symptoms change between visits, contact the practice rather than waiting for the next check-up.\n\n## Getting ready for your appointment\nWrite down your questions, bring relevant health information and mention any concerns. You can ask the practitioner to repeat or rephrase an explanation before deciding what to do next.\n\nThis article is general information and does not replace a consultation. Confirm individual advice with a health professional.",
      authorEn: "Practice team",
      imageAlt: "Illustration of a patient discussing dental follow-up with a practitioner.",
      imageAltEn: "Illustration of a patient discussing dental follow-up with a practitioner.",
    },
  ],
  campaigns: [
    {
      id: "campagne-demo",
      title: "Informations du cabinet",
      description:
        "Texte de démonstration à remplacer par une information vérifiée du cabinet.",
      mediaType: "image",
      imageUrl: "",
      videoUrl: null,
      active: true,
      titleEn: "Practice information",
      descriptionEn: "Sample text to replace with information verified by the practice.",
    },
  ],
});
