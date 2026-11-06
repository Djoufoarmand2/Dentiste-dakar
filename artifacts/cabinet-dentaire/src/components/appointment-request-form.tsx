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
  appointmentProviderName,
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
  const [notificationSent, setNotificationSent] = useState<boolean | null>(null);
  const submissionId = useRef<string | null>(null);
  const phoneValue = form.watch("phone");
  const emailValue = form.watch("email");
  const phoneDigits = phoneValue.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 8 && phoneDigits.length <= 15;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const phoneLink = phone.replace(/[^\d+]/g, "");

  const submit = async (values: AppointmentFormValues) => {
    request.reset();
    setSubmissionAccepted(null);
    setNotificationSent(null);
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
          email: values.email.trim(),
          service: values.service,
          preferredDate: values.preferredDate || undefined,
          preferredWindow: values.preferredWindow || undefined,
          message: values.message?.trim() || undefined,
          website: values.website,
      });
      setNotificationSent(result.notificationSent ?? null);
      setSubmissionAccepted(result.accepted === true);
      if (result.accepted === true) {
        form.reset(defaultValues);
        submissionId.current = null;
      }
    } catch {
      setSubmissionAccepted(false);
    }
  };

  return (
    <>
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
          name="email"
          rules={{
            required: en ? "Enter your email address." : "Indiquez votre adresse e-mail.",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: en ? "Enter a valid email address." : "Saisissez une adresse e-mail valide.",
            },
            maxLength: 254,
          }}
            render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{en ? "Email address *" : "Adresse e-mail *"}</FormLabel>
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
                  {en ? "Your email address is required." : "Votre adresse e-mail est obligatoire."}
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
            {appointmentProviderName
              ? (en
                ? `Your request will be recorded in Supabase and a notification sent via ${appointmentProviderName}.`
                : `Votre demande sera enregistrée dans Supabase et notifiée via ${appointmentProviderName}.`)
              : (en ? "Your request will be stored in the practice's private workspace." : "Votre demande sera enregistrée dans l’espace privé du cabinet.")}{" "}
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
              ? "Your request has been received. The practice will contact you to confirm an appointment. Submitting this form does not reserve a time slot."
              : "Votre demande a bien été reçue. Le cabinet vous recontactera pour confirmer le rendez-vous. L’envoi de ce formulaire ne réserve pas encore de créneau."}
            {notificationSent === false && (
              <span className="mt-2 block font-medium">
                {en
                  ? "The email notification could not be sent. Your request is still available to the practice; there is no need to send it again."
                  : "La notification par e-mail n’a pas pu être envoyée. Votre demande reste disponible pour le cabinet dans son espace privé; inutile de la renvoyer."}
              </span>
            )}
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
