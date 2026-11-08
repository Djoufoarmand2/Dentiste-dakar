import { useMutation } from "@tanstack/react-query";
import type { ContactAppointmentInput } from "@workspace/api-client-react";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  submitAppointmentRequest,
} from "@/lib/appointment-delivery";
import { useSiteLocale } from "@/lib/site-locale";

type AppointmentWindow = NonNullable<ContactAppointmentInput["preferredWindow"]>;

type AppointmentFormValues = Omit<ContactAppointmentInput, "service" | "preferredWindow"> & {
  service: ContactAppointmentInput["service"] | "";
  preferredWindow: AppointmentWindow | "";
  website: string;
};

const serviceOptions: ContactAppointmentInput["service"][] = [
  "Consultation dentaire",
  "Détartrage et polissage",
  "Traitement des caries",
  "Plombage / composite",
  "Kinésithérapie dentaire / maxillo-faciale",
  "Laboratoire prothétique",
  "Chirurgie dentaire",
];

const defaultValues: AppointmentFormValues = {
  name: "",
  phone: "",
  email: "",
  contactChannel: "email",
  whatsappConsent: false,
  service: "",
  preferredDate: "",
  preferredWindow: "",
  message: "",
  website: "",
};

export function AppointmentRequestForm({ phone = "+237 677 87 34 42" }: { phone?: string }) {
  const locale = useSiteLocale();
  const en = locale === "en";
  const form = useForm<AppointmentFormValues>({ defaultValues, mode: "onChange" });
  const request = useMutation({
    mutationFn: submitAppointmentRequest,
  });
  const [submissionAccepted, setSubmissionAccepted] = useState<boolean | null>(null);
  const [requestReceived, setRequestReceived] = useState(false);
  const submissionId = useRef<string | null>(null);
  const phoneValue = form.watch("phone");
  const emailValue = form.watch("email");
  const contactChannel = form.watch("contactChannel");
  const phoneDigits = phoneValue.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 8 && phoneDigits.length <= 15;
  const emailValid = !emailValue || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const phoneLink = phone.replace(/[^\d+]/g, "");

  const submit = async (values: AppointmentFormValues) => {
    // React Hook Form invokes this from the submit button or keyboard submit;
    // the API stores the request for the practice to review and answer manually.
    request.reset();
    setSubmissionAccepted(null);
    setRequestReceived(false);
    if (!values.service) {
      form.setError("service", {
        type: "required",
        message: en ? "Please choose a service." : "Choisissez un soin.",
      });
      return;
    }

    try {
      const result = await request.mutateAsync({
          submissionId: submissionId.current ?? (submissionId.current = crypto.randomUUID()),
          name: values.name.trim(),
          phone: values.phone.trim(),
          email: values.email?.trim() ?? "",
          contactChannel: values.contactChannel,
          whatsappConsent: values.whatsappConsent === true,
          service: values.service,
          preferredDate: values.preferredDate || undefined,
          preferredWindow: values.preferredWindow || undefined,
          message: values.message?.trim() || undefined,
          website: values.website,
      });
      setSubmissionAccepted(result.accepted === true);
      if (result.accepted === true) {
        setRequestReceived(true);
        form.reset(defaultValues);
        submissionId.current = null;
      }
    } catch {
      setSubmissionAccepted(false);
    }
  };

  return (
    <>
    {requestReceived && (
      <p
        role="status"
        className="mb-5 rounded-md border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
        data-testid="status-appointment-received-inline"
      >
        {en
          ? <>We received your request. Please allow up to 24 hours for a reply and appointment confirmation. This request does not reserve a time slot. For urgent concerns, call <a className="font-semibold underline underline-offset-2" href={`tel:${phoneLink}`}>{phone}</a>.</>
          : <>Nous avons bien reçu votre demande. Merci de patienter jusqu’à 24 h pour une réponse et la confirmation d’un créneau. Cette demande ne réserve pas de rendez-vous. En cas d’urgence, appelez le <a className="font-semibold underline underline-offset-2" href={`tel:${phoneLink}`}>{phone}</a>.</>}
      </p>
    )}
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="mt-7 space-y-5"
        data-testid="form-appointment-request"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            rules={{ required: en ? "Enter your full name." : "Indiquez votre nom et prénom.", maxLength: 120 }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{en ? "Full name *" : "Nom et prénom *"}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    name={field.name}
                    autoComplete="name"
                    placeholder={en ? "e.g. Amina Njoya" : "Ex. Jean Dupont"}
                    maxLength={120}
                    className="bg-white"
                    data-testid="input-appointment-name"
                  />
                </FormControl>
                <FormDescription className="sr-only">
                  {en ? "Your full name is required." : "Votre nom et prénom sont obligatoires."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            rules={{
              required: en ? "Enter your phone number." : "Indiquez votre numéro de téléphone.",
              maxLength: { value: 40, message: en ? "The number is too long." : "Le numéro est trop long." },
              validate: (value) => {
                const digits = value.replace(/\D/g, "");
                return (digits.length >= 8 && digits.length <= 15) || (en ? "Enter a valid phone number." : "Saisissez un numéro de téléphone valide.");
              },
            }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{en ? "Phone number *" : "Numéro de téléphone *"}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    name={field.name}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+237 6XX XX XX XX"
                    maxLength={40}
                    aria-invalid={fieldState.invalid}
                    className={`bg-white ${fieldState.invalid ? "input-invalid" : phoneValue ? (phoneValid ? "input-valid" : "input-invalid") : ""}`}
                    data-testid="input-appointment-phone"
                  />
                </FormControl>
                <FormDescription className="sr-only">
                  {en ? "Your phone number is required." : "Votre numéro de téléphone est obligatoire."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="contactChannel"
          render={({ field }) => (
            <FormItem>
              <fieldset>
                <legend className="text-sm font-medium">
                  {en ? "How should we reply?" : "Comment souhaitez-vous recevoir une réponse ?"}
                </legend>
                <FormDescription>
                  {en
                    ? "Choose how the practice may contact you. WhatsApp requires your consent."
                    : "Choisissez comment le cabinet peut vous recontacter. WhatsApp nécessite votre accord."}
                </FormDescription>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {([
                    ["email", en ? "Email" : "E-mail"],
                    ["whatsapp", "WhatsApp"],
                    ["both", en ? "Both" : "Les deux"],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="cursor-pointer">
                      <input
                        ref={field.ref}
                        type="radio"
                        name={field.name}
                        value={value}
                        checked={field.value === value}
                        onChange={() => {
                          field.onChange(value);
                          if (value === "whatsapp") form.clearErrors("email");
                        }}
                        onBlur={field.onBlur}
                        className="peer sr-only"
                        data-testid={`radio-contact-channel-${value}`}
                      />
                      <span className={`flex min-h-12 items-center justify-center rounded-lg border px-3 text-sm font-medium transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#b5965a] ${
                        field.value === value
                          ? "border-[#18365f] bg-[#edf2ff] text-[#18365f]"
                          : "border-[#18365f]/20 bg-white text-[#20213e] hover:border-[#315c9a]/55"
                      }`}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <FormMessage />
            </FormItem>
          )}
        />

        {contactChannel !== "email" && (
          <FormField
            control={form.control}
            name="whatsappConsent"
            rules={{
              validate: (value) =>
                value === true || (en
                  ? "Please consent before choosing WhatsApp."
                  : "Votre accord est nécessaire pour choisir WhatsApp."),
            }}
            render={({ field }) => (
              <FormItem>
                <label className="flex items-start gap-3 rounded-lg border border-[#18365f]/15 bg-white p-4 text-sm leading-6">
                  <input
                    ref={field.ref}
                    type="checkbox"
                    checked={field.value === true}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    className="mt-1 accent-[#18365f]"
                    data-testid="checkbox-whatsapp-consent"
                  />
                  <span>
                    {en
                      ? "I agree to be contacted on WhatsApp about this request. No marketing messages."
                      : "J’accepte d’être recontacté sur WhatsApp au sujet de cette demande. Aucun message publicitaire."}
                  </span>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="email"
          rules={{
            required: contactChannel !== "whatsapp" && (en ? "Enter your email address." : "Indiquez votre adresse e-mail."),
            validate: (value) => {
              if (!value && contactChannel === "whatsapp") return true;
              return (typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) || (en
                ? "Enter a valid email address."
                : "Saisissez une adresse e-mail valide.");
            },
            maxLength: 254,
          }}
            render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{en ? `Email address${contactChannel !== "whatsapp" ? " *" : ""}` : `Adresse e-mail${contactChannel !== "whatsapp" ? " *" : ""}`}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  name={field.name}
                  type="email"
                  autoComplete="email"
                  placeholder="patient@email.com"
                  maxLength={254}
                    aria-invalid={fieldState.invalid}
                  className={`bg-white ${fieldState.invalid ? "input-invalid" : emailValue ? (emailValid ? "input-valid" : "input-invalid") : ""}`}
                  data-testid="input-appointment-email"
                />
              </FormControl>
              <FormDescription className="sr-only">
                  {contactChannel === "whatsapp"
                    ? (en ? "Email is optional for WhatsApp contact." : "L’e-mail est facultatif si vous choisissez WhatsApp.")
                    : (en ? "Your email address is required." : "Votre adresse e-mail est obligatoire.")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service"
          rules={{ required: en ? "Please choose a service." : "Choisissez un soin." }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{en ? "Service or consultation *" : "Soin ou consultation *"}</FormLabel>
              <FormControl>
                <select
                  {...field}
                  name={field.name}
                  value={field.value}
                  className="editor-input bg-white"
                  data-testid="select-appointment-service"
                >
                  <option value="">{en ? "Choose a service" : "Choisissez un soin"}</option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {en ? ({
                        "Consultation dentaire": "Dental consultation",
                        "Détartrage et polissage": "Scaling and polishing",
                        "Traitement des caries": "Cavity treatment",
                        "Plombage / composite": "Filling / composite",
                        "Kinésithérapie dentaire / maxillo-faciale": "Dental / maxillofacial physiotherapy",
                        "Laboratoire prothétique": "Prosthetics laboratory",
                        "Chirurgie dentaire": "Dental surgery",
                      } as Record<string, string>)[service] : service}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription className="sr-only">
                {en ? "Select the service you are interested in." : "Sélectionnez le soin souhaité."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferredWindow"
          render={({ field }) => (
            <FormItem>
              <fieldset className="w-full">
                <legend className="text-sm font-medium">
                  {en ? "Preferred opening hours" : "Plage d’ouverture souhaitée"}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({en ? "optional" : "facultatif"})
                  </span>
                </legend>
                <FormDescription id="appointment-window-description">
                  {en
                    ? "Choose a preferred period. The practice will contact you to confirm; this does not reserve an appointment."
                    : "Choisissez une plage de préférence. Le cabinet vous recontactera pour confirmer ; ce choix ne réserve pas un rendez-vous."}
                </FormDescription>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {([
                    {
                      value: "weekdays",
                      title: en ? "Monday–Friday" : "Lundi–vendredi",
                      hours: en ? "4:00–7:00 pm" : "16 h–19 h",
                    },
                    {
                      value: "saturday",
                      title: en ? "Saturday" : "Samedi",
                      hours: en ? "10:00 am–2:00 pm" : "10 h–14 h",
                    },
                  ] as const).map((option) => (
                    <label key={option.value} className="group relative block cursor-pointer">
                      <input
                        ref={field.ref}
                        type="radio"
                        name={field.name}
                        value={option.value}
                        checked={field.value === option.value}
                        onChange={() => field.onChange(option.value)}
                        onBlur={field.onBlur}
                        aria-describedby="appointment-window-description"
                        className="peer sr-only"
                        data-testid={`radio-appointment-window-${option.value}`}
                      />
                      <span className={`flex min-h-[76px] flex-col justify-center rounded-xl border px-4 py-3 transition-[border-color,background-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 ${
                        field.value === option.value
                          ? "border-[#315c9a] bg-[#edf2ff] text-[#18365f] shadow-[0_8px_22px_rgba(49,92,154,.14)]"
                          : "border-[#18365f]/20 bg-white text-[#20213e] hover:border-[#315c9a]/55"
                      } peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#7778bd]`}>
                        <span className="text-sm font-semibold">{option.title}</span>
                        <span className="mt-1 text-sm">{option.hours}</span>
                        <span className="text-xs text-muted-foreground">
                          {en ? "By appointment" : "Sur rendez-vous"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferredDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{en ? "Preferred date" : "Date souhaitée"} <span className="font-normal text-muted-foreground">({en ? "optional" : "facultatif"})</span></FormLabel>
              <FormControl>
                <Input
                  {...field}
                  name={field.name}
                  type="date"
                  className="bg-white"
                  data-testid="input-appointment-date"
                />
              </FormControl>
              <FormDescription className="sr-only">
                {en ? "You may leave this field blank." : "Vous pouvez laisser ce champ vide."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{en ? "Message or details" : "Message ou précisions"} <span className="font-normal text-muted-foreground">({en ? "optional" : "facultatif"})</span></FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  name={field.name}
                  rows={4}
                  maxLength={2000}
                  placeholder={en ? "Tell us what you need or when you are available..." : "Décrivez votre besoin ou vos disponibilités..."}
                  className="min-h-28 bg-white"
                  data-testid="textarea-appointment-message"
                />
              </FormControl>
              <FormDescription className="sr-only">
                {en ? "Tell us what you need or when you are available." : "Décrivez votre besoin ou vos disponibilités."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div
          className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor="appointment-website">{en ? "Leave this field blank" : "Ne pas remplir ce champ"}</label>
          <input
            id="appointment-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...form.register("website")}
            name="website"
          />
        </div>

        {(request.isError || submissionAccepted === false) && (
          <p
            role="alert"
            className="rounded-md border border-[#e7c8c1] bg-[#f8e9e5] p-4 text-sm leading-6 text-[#943d35]"
            data-testid="status-appointment-error"
          >
            {en ? "Your request could not be sent. Please try again." : (request.error instanceof Error && request.error.message
              ? request.error.message
              : "L’envoi n’a pas abouti. Réessayez.")}{" "}
            {en ? "Contact the practice by phone at " : "Contactez le cabinet par téléphone au "}
            <a href={`tel:${phoneLink}`} className="font-semibold underline underline-offset-2">
              {phone}
            </a>.
          </p>
        )}

        <div>
          <Button
            type="submit"
            variant="ghost"
            disabled={request.isPending}
            className="btn-gold min-h-12 w-full sm:w-auto"
            data-testid="button-submit-appointment"
          >
            {request.isPending ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                {en ? "Sending…" : "Envoi en cours…"}
              </>
            ) : (
              <>
                {en ? "Send appointment request" : "Confirmer la demande de RDV"}
                <ArrowRight size={16} />
              </>
            )}
          </Button>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {en
              ? "Your request is stored in the practice’s private inbox. The team will contact you manually using your selected preference."
              : "Votre demande est enregistrée dans l’espace privé du cabinet. L’équipe vous recontactera manuellement selon votre préférence."}{" "}
            {en ? "This does not confirm an appointment." : "Elle ne confirme pas encore un rendez-vous."}
          </p>
        </div>
      </form>
    </Form>
    <Dialog
      open={submissionAccepted === true}
      onOpenChange={(open) => {
        if (!open) setSubmissionAccepted(null);
      }}
    >
      <DialogContent className="confirmation-in max-w-md border-[#073e53]/10 bg-white">
        <DialogHeader className="items-center text-center">
          <span className="mb-2 grid h-14 w-14 place-items-center rounded-full bg-[#e6e3eb] text-[#5d7f46]">
            <CheckCircle2 size={27} aria-hidden="true" />
          </span>
          <DialogTitle className="font-display text-2xl text-[#073e53]">
            {en ? "Request received" : "Demande enregistrée"}
          </DialogTitle>
          <DialogDescription
            role="status"
            className="pt-2 text-sm leading-6"
            data-testid="status-appointment-success"
          >
            {en
              ? "We received your request. Please allow up to 24 hours for a reply and appointment confirmation. This request does not reserve a time slot."
              : "Nous avons bien reçu votre demande. Merci de patienter jusqu’à 24 h pour une réponse et la confirmation d’un créneau. Cette demande ne réserve pas de rendez-vous."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              className="btn-gold w-full sm:w-auto"
              data-testid="button-close-appointment-confirmation"
            >
              {en ? "Done" : "Terminé"}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
