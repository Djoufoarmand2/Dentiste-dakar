import {
  useSubmitContactAppointment,
  type ContactAppointmentInput,
} from "@workspace/api-client-react";
import { ArrowRight, LoaderCircle } from "lucide-react";
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

type AppointmentFormValues = Omit<ContactAppointmentInput, "service"> & {
  service: ContactAppointmentInput["service"] | "";
  website: string;
};

const serviceOptions: ContactAppointmentInput["service"][] = [
  "Consultation générale / Bilan",
  "Facettes dentaires en composite",
  "Esthétique dentaire",
  "Blanchiment dentaire",
  "Implants dentaires",
  "Orthodontie",
  "Chirurgie dentaire",
  "Urgence dentaire",
];

const defaultValues: AppointmentFormValues = {
  name: "",
  phone: "",
  email: "",
  service: "",
  preferredDate: "",
  message: "",
  website: "",
};

export function AppointmentRequestForm() {
  const form = useForm<AppointmentFormValues>({ defaultValues });
  const request = useSubmitContactAppointment();

  const submit = async (values: AppointmentFormValues) => {
    request.reset();
    if (!values.service) {
      form.setError("service", {
        type: "required",
        message: "Choisissez un soin.",
      });
      return;
    }

    try {
      await request.mutateAsync({
        data: {
          name: values.name.trim(),
          phone: values.phone.trim(),
          email: values.email.trim(),
          service: values.service,
          preferredDate: values.preferredDate || undefined,
          message: values.message?.trim() || undefined,
          website: values.website,
        },
      });
      form.reset(defaultValues);
    } catch {
      // The mutation state below displays a clear message without losing the form values.
    }
  };

  return (
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
            rules={{ required: "Indiquez votre nom et prénom.", maxLength: 120 }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom et prénom *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="name"
                    placeholder="Ex. Jean Dupont"
                    maxLength={120}
                    className="bg-white"
                    data-testid="input-appointment-name"
                  />
                </FormControl>
                <FormDescription className="sr-only">
                  Votre nom et prénom sont obligatoires.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            rules={{ required: "Indiquez votre numéro de téléphone.", maxLength: 40 }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de téléphone *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+237 6XX XX XX XX"
                    maxLength={40}
                    className="bg-white"
                    data-testid="input-appointment-phone"
                  />
                </FormControl>
                <FormDescription className="sr-only">
                  Votre numéro de téléphone est obligatoire.
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
            required: "Indiquez votre adresse e-mail.",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Saisissez une adresse e-mail valide.",
            },
            maxLength: 254,
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse e-mail *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  placeholder="patient@email.com"
                  maxLength={254}
                  className="bg-white"
                  data-testid="input-appointment-email"
                />
              </FormControl>
              <FormDescription className="sr-only">
                Votre adresse e-mail est obligatoire.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service"
          rules={{ required: "Choisissez un soin." }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Soin ou consultation *</FormLabel>
              <FormControl>
                <select
                  {...field}
                  value={field.value}
                  className="editor-input bg-white"
                  data-testid="select-appointment-service"
                >
                  <option value="">Choisissez un soin</option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription className="sr-only">
                Sélectionnez le soin souhaité.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferredDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date souhaitée <span className="font-normal text-muted-foreground">(facultatif)</span></FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  className="bg-white"
                  data-testid="input-appointment-date"
                />
              </FormControl>
              <FormDescription className="sr-only">
                Vous pouvez laisser ce champ vide.
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
              <FormLabel>Message ou précisions <span className="font-normal text-muted-foreground">(facultatif)</span></FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={4}
                  maxLength={2000}
                  placeholder="Décrivez votre besoin ou vos disponibilités..."
                  className="min-h-28 bg-white"
                  data-testid="textarea-appointment-message"
                />
              </FormControl>
              <FormDescription className="sr-only">
                Décrivez votre besoin ou vos disponibilités.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div
          className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor="appointment-website">Ne pas remplir ce champ</label>
          <input
            id="appointment-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...form.register("website")}
          />
        </div>

        {request.isSuccess && (
          <p
            role="status"
            className="rounded-md border border-[#8c6f0b]/40 bg-[#e6e3eb] p-4 text-sm leading-6 text-[#073e53]"
            data-testid="status-appointment-success"
          >
            Votre demande a bien été transmise. Le cabinet vous recontactera pour
            confirmer le rendez-vous.
          </p>
        )}
        {request.isError && (
          <p
            role="alert"
            className="rounded-md border border-[#e7c8c1] bg-[#f8e9e5] p-4 text-sm leading-6 text-[#943d35]"
            data-testid="status-appointment-error"
          >
            L’envoi n’a pas abouti. Réessayez ou contactez le cabinet par
            téléphone.
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
                Envoi en cours…
              </>
            ) : (
              <>
                Confirmer la demande de RDV
                <ArrowRight size={16} />
              </>
            )}
          </Button>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Vos coordonnées servent uniquement à traiter votre demande. L’envoi
            d’une demande ne confirme pas encore un rendez-vous.
          </p>
        </div>
      </form>
    </Form>
  );
}
