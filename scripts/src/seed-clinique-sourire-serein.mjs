import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAIL'];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`Missing required environment variable: ${key}`);
}

const supabaseUrl = process.env.SUPABASE_URL.trim().replace(/\/+$/, '');
const expectedAdminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const demoServiceIds = new Set(['soin-preventif', 'soin-esthetique', 'soin-orthodontie']);
const demoFaqIds = new Set(['faq-rendez-vous', 'faq-premiere-visite', 'faq-enfants']);
const demoBlogIds = new Set(['conseils-hygiene', 'visite-controle']);
const demoGalleryIds = new Set(['cabinet-1', 'cabinet-2', 'cabinet-3']);
const photoId = 'photo-clinique-la-bienveillance';
const partnerLogoId = 'partner-clinique-la-bienveillance-logo';
const photoPath = resolve('attached_assets/WhatsApp_Image_2026-11-05_at_04.31.20_1793850490526.jpeg');
const logoPath = resolve('attached_assets/WhatsApp_Image_2026-11-05_at_04.31.20(1)_1793850481693.jpeg');

function assertJpeg(bytes, label) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
    throw new Error(`${label} is not a valid JPEG file.`);
  }
}

async function findConfiguredAdmin() {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error('Could not verify the configured administrator.');
    const admin = data.users.find((user) => user.email?.trim().toLowerCase() === expectedAdminEmail);
    if (admin) {
      if (!admin.email_confirmed_at) throw new Error('The configured administrator email is not confirmed.');
      const { data: claimed, error: claimError } = await supabase.rpc('cabinet_claim_admin', { p_user_id: admin.id });
      if (claimError || claimed !== true) throw new Error('The configured account is not authorized to publish clinic content.');
      return admin.id;
    }
    if (data.users.length < 1000) break;
  }
  throw new Error('No confirmed Supabase account matches the configured clinic administrator.');
}

async function uploadOfficialImage({ bytes, fileName, alt }) {
  const { data: existing, error: lookupError } = await supabase
    .from('cabinet_media')
    .select('path,public_url,mime_type,size')
    .eq('name', fileName)
    .eq('status', 'ready')
    .limit(1)
    .maybeSingle();
  if (lookupError) throw new Error('Could not verify the existing clinic media library.');
  if (existing && existing.mime_type === 'image/jpeg' && Number(existing.size) === bytes.length) {
    const { data: info, error: infoError } = await supabase.storage.from('cabinet-media').info(existing.path);
    if (!infoError && Number(info?.size) === bytes.length && info?.contentType === 'image/jpeg') {
      return { id: existing.path, imageUrl: existing.public_url, alt };
    }
  }
  const path = `uploads/${randomUUID()}.jpg`;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/cabinet-media/${path}`;
  const { error: rowError } = await supabase.from('cabinet_media').insert({
    path,
    public_url: publicUrl,
    name: fileName,
    mime_type: 'image/jpeg',
    size: bytes.length,
    status: 'uploading',
  });
  if (rowError) throw new Error('Could not register an official clinic image.');

  const { error: uploadError } = await supabase.storage.from('cabinet-media').upload(path, bytes, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) {
    await supabase.from('cabinet_media').delete().eq('path', path);
    throw new Error('Could not upload an official clinic image.');
  }
  const { data: storageInfo, error: infoError } = await supabase.storage.from('cabinet-media').info(path);
  if (infoError || Number(storageInfo?.size) !== bytes.length || storageInfo?.contentType !== 'image/jpeg') {
    await supabase.storage.from('cabinet-media').remove([path]);
    await supabase.from('cabinet_media').delete().eq('path', path);
    throw new Error('Uploaded image verification failed.');
  }
  const { error: readyError } = await supabase.from('cabinet_media').update({ status: 'ready' }).eq('path', path).eq('status', 'uploading');
  if (readyError) throw new Error('Could not finalize an official clinic image.');
  return { id: path, imageUrl: publicUrl, alt };
}

const officialServices = [
  {
    id: 'consultation-dentaire',
    title: 'Consultation dentaire',
    summary: 'Un bilan et un échange pour faire le point sur votre santé bucco-dentaire.',
    description: 'La consultation permet d’exposer votre besoin et de discuter avec le professionnel des examens ou soins adaptés à votre situation.',
    imageUrl: '',
  },
  {
    id: 'detartrage-polissage',
    title: 'Détartrage et polissage',
    summary: 'Un soin d’hygiène bucco-dentaire réalisé au cabinet.',
    description: 'Le professionnel évalue vos besoins et vous indique si un détartrage ou un polissage est adapté, ainsi que les conseils d’entretien à suivre.',
    imageUrl: '',
  },
  {
    id: 'traitement-caries',
    title: 'Traitement des caries',
    summary: 'Une prise en charge après examen par un professionnel dentaire.',
    description: 'Le soin dépend de l’examen clinique et de l’étendue de la lésion. Le praticien vous explique les options avant toute intervention.',
    imageUrl: '',
  },
  {
    id: 'plombage-composite',
    title: 'Plombage / composite',
    summary: 'Des restaurations dentaires proposées selon le bilan réalisé.',
    description: 'Le choix du matériau et de la technique est discuté avec le praticien en fonction de la dent concernée et de votre situation.',
    imageUrl: '',
  },
  {
    id: 'kinesitherapie-maxillo-faciale',
    title: 'Kinésithérapie dentaire et maxillo-faciale',
    summary: 'Un accompagnement fonctionnel après évaluation de votre besoin.',
    description: 'Les indications et les modalités sont définies avec le professionnel selon les symptômes, l’examen et, si besoin, l’orientation adaptée.',
    imageUrl: '',
  },
  {
    id: 'laboratoire-prothetique',
    title: 'Laboratoire prothétique',
    summary: 'Un bloc prothétique associé à la prise en charge du cabinet.',
    description: 'Les solutions prothétiques sont déterminées avec le praticien après évaluation et présentation des options adaptées.',
    imageUrl: '',
  },
  {
    id: 'chirurgie-dentaire',
    title: 'Chirurgie dentaire',
    summary: 'Une évaluation et une prise en charge selon l’indication clinique.',
    description: 'Le type d’intervention, les précautions et le suivi sont expliqués par le professionnel avant la réalisation du soin.',
    imageUrl: '',
  },
  {
    id: 'maternite-clinique-bienveillance',
    title: 'Maternité · Clinique La Bienveillance',
    summary: 'Un service de l’établissement partenaire qui accueille le cabinet dentaire.',
    description: 'La maternité relève de la Clinique La Bienveillance et non du cabinet dentaire. Contactez directement l’établissement pour connaître les modalités de ce service.',
    imageUrl: '',
  },
];
const officialServiceIds = new Set(officialServices.map((service) => service.id));

const officialFaqs = [
  {
    id: 'faq-rendez-vous-officiel',
    question: 'Comment prendre rendez-vous ?',
    answer: 'Appelez ou écrivez sur WhatsApp au +237 677 87 34 42. Vous pouvez également envoyer une demande avec le formulaire de contact lorsque celui-ci est disponible.',
  },
  {
    id: 'faq-adresse-officielle',
    question: 'Où se trouve le cabinet ?',
    answer: 'Le Cabinet Sourire Serein se trouve au sein de la Clinique La Bienveillance, à l’Ancienne gare routière, Dakar, Douala, Cameroun. Utilisez le lien Google Maps de la page Contact pour l’itinéraire.',
  },
  {
    id: 'faq-horaires-officiels',
    question: 'Quels sont les horaires affichés ?',
    answer: 'Les horaires communiqués pour le cabinet sont 24 h/24 et 7 j/7. Appelez avant de vous déplacer afin de confirmer la disponibilité du service dentaire, notamment en dehors des heures habituelles.',
  },
  {
    id: 'faq-soins-officiels',
    question: 'Quels soins dentaires sont présentés ?',
    answer: 'Consultation dentaire, détartrage et polissage, traitement des caries, restaurations en composite, kinésithérapie maxillo-faciale, laboratoire prothétique et chirurgie dentaire. Le soin adapté est déterminé après évaluation.',
  },
  {
    id: 'faq-maternite-officielle',
    question: 'La maternité fait-elle partie du cabinet dentaire ?',
    answer: 'Non. La maternité est un service de la Clinique La Bienveillance, l’établissement partenaire qui accueille le cabinet dentaire. Contactez directement l’établissement partenaire pour ce service.',
  },
];

const officialBlogPosts = [
  {
    id: 'urgence-dentaire-douala',
    slug: 'urgence-dentaire-douala-que-faire',
    title: 'Douleur dentaire : comment contacter le cabinet à Douala ?',
    excerpt: 'Les bons réflexes pour demander une évaluation et savoir quand contacter les services d’urgence.',
    date: '2026-11-05',
    author: 'Équipe du Cabinet Sourire Serein',
    published: true,
    imageUrl: '',
    content: `## Contactez le cabinet\nEn cas de douleur dentaire importante ou qui s’aggrave, appelez le Cabinet Sourire Serein au +237 677 87 34 42 pour expliquer la situation et confirmer la disponibilité du service dentaire. Les horaires affichés sont 24 h/24 et 7 j/7 ; un appel avant le déplacement permet de vérifier la prise en charge.\n\n## En attendant un avis professionnel\nDécrivez vos symptômes et signalez les traitements déjà pris ou les allergies connues. Évitez de poser un médicament directement sur la dent ou la gencive et ne prenez pas de traitement qui ne vous a pas été conseillé par un professionnel.\n\n## Quand demander une aide médicale urgente\nUne difficulté à respirer ou à avaler, un gonflement important du visage, un traumatisme sérieux ou un saignement incontrôlé justifient une aide médicale urgente. Cet article donne des repères généraux et ne remplace pas un examen ni un avis médical.`,
  },
  {
    id: 'detartrage-et-polissage',
    slug: 'detartrage-polissage-questions',
    title: 'Détartrage et polissage : les questions à poser',
    excerpt: 'À quoi sert un rendez-vous d’hygiène bucco-dentaire et comment en parler avec le praticien ?',
    date: '2026-11-05',
    author: 'Équipe du Cabinet Sourire Serein',
    published: true,
    imageUrl: '',
    content: `## Parler de vos habitudes et de vos attentes\nLors d’un rendez-vous, indiquez au professionnel les zones sensibles, les saignements éventuels et les soins déjà reçus. Ces informations aident à adapter l’examen et les conseils à votre situation.\n\n## Un soin décidé après évaluation\nLe professionnel vous explique si un détartrage ou un polissage est indiqué et répond à vos questions sur le déroulement. La fréquence de suivi dépend de l’évaluation individuelle ; elle n’est pas identique pour tout le monde.\n\n## Après le rendez-vous\nDemandez des conseils d’hygiène adaptés à vos dents et à vos gencives. En cas de douleur persistante ou de symptôme inhabituel après un soin, contactez le cabinet pour obtenir un avis.`,
  },
  {
    id: 'kinesitherapie-maxillo-faciale',
    slug: 'kinesitherapie-maxillo-faciale-informations',
    title: 'Kinésithérapie maxillo-faciale : quand demander conseil ?',
    excerpt: 'Quelques repères pour préparer un échange avec le professionnel au sujet de la mâchoire et de ses fonctions.',
    date: '2026-11-05',
    author: 'Équipe du Cabinet Sourire Serein',
    published: true,
    imageUrl: '',
    content: `## Exposez précisément votre gêne\nSi vous ressentez une gêne au niveau de la mâchoire ou de la face, décrivez quand elle survient, depuis combien de temps et ce qui semble l’accentuer. Mentionnez aussi les soins ou examens déjà réalisés.\n\n## Une indication dépend de l’évaluation\nLa kinésithérapie dentaire ou maxillo-faciale ne convient pas à toutes les situations. Le professionnel évalue votre besoin et vous indique si un accompagnement est adapté ou s’il faut une autre orientation.\n\n## Préparez vos questions\nVous pouvez demander quel est l’objectif proposé, comment se déroule la prise en charge et quel suivi est envisagé. Les réponses dépendent de votre examen et de votre situation personnelle.`,
  },
  {
    id: 'grossesse-et-sante-bucco-dentaire',
    slug: 'grossesse-sante-bucco-dentaire',
    title: 'Grossesse et soins dentaires : en parler au praticien',
    excerpt: 'Pourquoi signaler une grossesse et demander conseil avant tout soin ou médicament.',
    date: '2026-11-05',
    author: 'Équipe du Cabinet Sourire Serein',
    published: true,
    imageUrl: '',
    content: `## Signalez votre grossesse dès le premier échange\nSi vous êtes enceinte ou pensez l’être, indiquez-le au professionnel avant un examen, un soin ou la prise d’un médicament. Précisez également le terme si vous le connaissez et les recommandations déjà reçues de votre équipe de suivi.\n\n## Demandez un avis adapté à votre situation\nLe calendrier et les modalités d’un soin dépendent de son urgence, de votre état de santé et de l’évaluation clinique. Le praticien peut échanger avec votre professionnel de suivi si cela est utile.\n\n## Ne retardez pas une question urgente sans conseil\nEn cas de douleur, de gonflement ou d’autre symptôme préoccupant, contactez un professionnel pour savoir quoi faire. Cet article est une information générale et ne remplace pas un avis personnalisé.`,
  },
];

const clinic = {
  name: 'Cabinet Sourire Serein',
  city: 'Douala',
  address: 'Ancienne gare routière, Dakar, Douala, Cameroun',
  phone: '+237 677 87 34 42',
  email: 'bienveillanceclinique4@gmail.com',
  openingHours: '24 h/24 · 7 j/7',
  mapUrl: 'https://www.google.com/maps/place/Clinique+La+Bienveillance/@4.0307524,9.7258638,17z/data=!4m6!3m5!1s0x10610d2ffb339343:0xcc207a6138777c30!8m2!3d4.0307524!4d9.7307347!16s%2Fg%2F11fltnv9l8',
  bookingUrl: 'https://wa.me/237677873442?text=Bonjour%2C%20je%20souhaite%20prendre%20rendez-vous%20au%20Cabinet%20Sourire%20Serein.',
};

async function main() {
  const adminId = await findConfiguredAdmin();
  const { data: currentRow, error: contentError } = await supabase
    .from('cabinet_site_content')
    .select('content,version')
    .eq('id', true)
    .single();
  if (contentError || !currentRow?.content || !Number.isInteger(currentRow.version)) {
    throw new Error('Could not read the current site content and version.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `backups/site-content-before-official-data-${stamp}.json`;
  const { error: backupError } = await supabase.storage.from('cabinet-site-content').upload(
    backupPath,
    JSON.stringify({ backedUpAt: new Date().toISOString(), version: currentRow.version, content: currentRow.content }),
    { contentType: 'application/json', cacheControl: '3600', upsert: false },
  );
  if (backupError) throw new Error('Could not create the private CMS backup; no content was changed.');

  const facadeBytes = await readFile(photoPath);
  const partnerLogoBytes = await readFile(logoPath);
  assertJpeg(facadeBytes, 'Clinic exterior photo');
  assertJpeg(partnerLogoBytes, 'Partner clinic logo');

  const createdMedia = [];
  let publicationStarted = false;
  try {
    const facade = await uploadOfficialImage({
      bytes: facadeBytes,
      fileName: 'Façade de la Clinique La Bienveillance',
      alt: 'Façade de la Clinique La Bienveillance à Douala',
    });
    createdMedia.push(facade.id);
    const partnerLogo = await uploadOfficialImage({
      bytes: partnerLogoBytes,
      fileName: 'Logo de la Clinique La Bienveillance',
      alt: 'Logo officiel de la Clinique La Bienveillance, établissement partenaire',
    });
    createdMedia.push(partnerLogo.id);

    const content = structuredClone(currentRow.content);
    const customGallery = (content.gallery || []).filter((item) =>
      item.imageUrl?.trim() && !demoGalleryIds.has(item.id) && item.id !== photoId && item.id !== partnerLogoId
    );
    const existingHeroImage = content.services?.find((item) => item.imageUrl?.trim())?.imageUrl || '';
    content.clinic = {
      ...content.clinic,
      ...clinic,
      logoUrl: content.clinic?.logoUrl || '',
    };
    content.hero = {
      ...content.hero,
      eyebrow: 'Cabinet dentaire à Douala',
      title: 'Des soins dentaires attentifs, au cœur de Douala.',
      description: 'Le Cabinet Sourire Serein vous accueille au sein de la Clinique La Bienveillance pour vos consultations et soins dentaires.',
      imageUrl: facade.imageUrl,
      primaryAction: 'Prendre rendez-vous',
      secondaryAction: 'Découvrir nos soins',
    };
    content.services = [
      ...officialServices.map((service, index) => ({
        ...service,
        slug: service.id,
        ...(index === 0 && existingHeroImage ? { imageUrl: existingHeroImage } : {}),
      })),
      ...(content.services || []).filter((item) => !demoServiceIds.has(item.id) && !officialServiceIds.has(item.id)),
    ];
    content.team = (content.team || []).filter((person) => person.id !== 'dr-naya');
    content.gallery = [
      { id: photoId, imageUrl: facade.imageUrl, alt: facade.alt },
      { id: partnerLogoId, imageUrl: partnerLogo.imageUrl, alt: partnerLogo.alt },
      ...customGallery,
    ];
    content.testimonials = (content.testimonials || []).filter((item) => !String(item.id).startsWith('avis-demo-'));
    content.faqs = [
      ...officialFaqs,
      ...(content.faqs || []).filter((item) => !demoFaqIds.has(item.id)),
    ];
    content.blogPosts = [
      ...officialBlogPosts,
      ...(content.blogPosts || []).filter((item) => !demoBlogIds.has(item.id)),
    ];
    content.campaigns = (content.campaigns || []).map((campaign) =>
      campaign.id === 'campagne-demo' ? { ...campaign, active: false } : campaign
    );

    publicationStarted = true;
    const { data: published, error: publishError } = await supabase.rpc('cabinet_publish', {
      p_actor: adminId,
      p_expected_version: currentRow.version,
      p_content: content,
    });
    if (publishError) throw new Error('The official content was prepared, but CMS publication failed. The previous content remains active.');

    console.log(JSON.stringify({
      result: 'published',
      version: published?.version ?? currentRow.version + 1,
      backup: backupPath,
      registeredOfficialImages: 2,
      preservedOldMedia: true,
    }));
  } catch (error) {
    if (!publicationStarted) {
      for (const path of createdMedia) {
        await supabase.storage.from('cabinet-media').remove([path]);
        await supabase.from('cabinet_media').delete().eq('path', path);
      }
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'CMS setup failed.');
  process.exitCode = 1;
});
