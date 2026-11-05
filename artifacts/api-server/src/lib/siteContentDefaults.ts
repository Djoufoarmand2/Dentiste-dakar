import { GetSiteContentResponse } from "@workspace/api-zod";

export const defaultSiteContent = GetSiteContentResponse.parse({
  clinic: {
    name: "Cabinet Sourire Serein",
    city: "Douala",
    address: "Bonanjo, Douala, Cameroun",
    phone: "+237 6 70 00 00 00",
    email: "contact@cabinet-naya.example",
    openingHours: "Lundi au vendredi · 8h–17h",
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
    },
    {
      id: "soin-esthetique",
      title: "Esthétique du sourire",
      slug: "esthetique",
      summary: "Des solutions adaptées à vos envies et à votre situation.",
      description:
        "Chaque prise en charge commence par un échange et une évaluation individuelle avec le praticien.",
      imageUrl: "",
    },
    {
      id: "soin-orthodontie",
      title: "Orthodontie",
      slug: "orthodontie",
      summary: "Un accompagnement personnalisé à chaque étape du traitement.",
      description:
        "Les possibilités de traitement sont déterminées après un examen et un diagnostic personnalisés.",
      imageUrl: "",
    },
  ],
  team: [
    {
      id: "dr-naya",
      name: "Dr Amélie Naya",
      role: "Chirurgienne-dentiste",
      biography: "Présentation fictive à remplacer par les informations vérifiées du cabinet.",
      imageUrl: "",
    },
  ],
  gallery: [
    { id: "cabinet-1", alt: "Espace d'accueil du cabinet", imageUrl: "" },
    { id: "cabinet-2", alt: "Salle de soins", imageUrl: "" },
    { id: "cabinet-3", alt: "Équipe du cabinet", imageUrl: "" },
  ],
  testimonials: [
    {
      id: "avis-demo-1",
      name: "Marie D. · exemple",
      service: "Visite de contrôle",
      quote:
        "Avis de démonstration fictif. Remplacez-le par un témoignage authentique avec l'accord de la personne.",
      rating: 5,
    },
    {
      id: "avis-demo-2",
      name: "Jean K. · exemple",
      service: "Première consultation",
      quote:
        "Avis de démonstration fictif. Remplacez-le par un témoignage authentique avec l'accord de la personne.",
      rating: 5,
    },
  ],
  faqs: [
    {
      id: "faq-rendez-vous",
      question: "Comment prendre rendez-vous ?",
      answer:
        "Contactez le cabinet par téléphone ou utilisez le lien de rendez-vous. Les coordonnées de démonstration sont à remplacer.",
    },
    {
      id: "faq-premiere-visite",
      question: "Que prévoir pour une première visite ?",
      answer:
        "Apportez vos informations de santé et vos éventuels examens récents. Le praticien vous indiquera les éléments utiles selon votre situation.",
    },
    {
      id: "faq-enfants",
      question: "Le cabinet reçoit-il les enfants ?",
      answer:
        "Les modalités d'accueil sont à confirmer directement avec le cabinet avant publication.",
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
        "Contenu de démonstration à faire relire et valider par le praticien avant publication. Un brossage régulier, des gestes adaptés et un suivi professionnel contribuent à la prévention. Demandez conseil à votre dentiste pour une recommandation adaptée à votre situation.",
      imageUrl: "",
      author: "Équipe du cabinet",
      date: "2026-10-01",
      published: true,
    },
    {
      id: "visite-controle",
      title: "Pourquoi prévoir un suivi dentaire régulier ?",
      slug: "suivi-dentaire-regulier",
      excerpt:
        "Le suivi permet de faire le point avec un professionnel et de poser vos questions.",
      content:
        "Article fictif à vérifier avant mise en ligne. La fréquence des visites dépend de chaque personne et doit être définie avec un professionnel de santé.",
      imageUrl: "",
      author: "Équipe du cabinet",
      date: "2026-09-18",
      published: true,
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
    },
  ],
});
