import {
  SubmitContactAppointmentBody,
  SubmitContactAppointmentResponse,
} from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const web3FormsEndpoint = "https://api.web3forms.com/submit";

router.post("/contact/appointment", async (req, res): Promise<void> => {
  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    res.status(403).json({ error: "Origine non autorisée." });
    return;
  }

  const parsed = SubmitContactAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Vérifiez les informations du formulaire." });
    return;
  }

  if (parsed.data.website?.trim()) {
    res.json(SubmitContactAppointmentResponse.parse({ accepted: true }));
    return;
  }

  const accessKey = process.env.WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) {
    res.status(503).json({
      error: "Le formulaire est temporairement indisponible. Contactez le cabinet par téléphone.",
    });
    return;
  }

  const name = parsed.data.name.trim();
  const phone = parsed.data.phone.trim();
  const email = parsed.data.email.trim().toLowerCase();
  if (!name || !phone) {
    res.status(400).json({ error: "Le nom et le numéro de téléphone sont obligatoires." });
    return;
  }

  try {
    const upstream = await fetch(web3FormsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: accessKey,
        subject: "Nouvelle demande de rendez-vous - Cabinet Dentaire",
        from_name: "Site Web Cabinet Dentaire",
        name,
        phone,
        email,
        service: parsed.data.service,
        preferred_date: parsed.data.preferredDate,
        preferred_window: parsed.data.preferredWindow === "weekdays"
          ? "Lundi-vendredi · 16 h–19 h (sur rendez-vous)"
          : parsed.data.preferredWindow === "saturday"
            ? "Samedi · 10 h–14 h (sur rendez-vous)"
            : "",
        message: parsed.data.message?.trim(),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const result = (await upstream.json().catch(() => null)) as
      | { success?: boolean }
      | null;
    if (!upstream.ok || result?.success !== true) {
      logger.warn(
        { statusCode: upstream.status },
        "Web3Forms did not accept an appointment request",
      );
      res.status(502).json({
        error: "L’envoi a échoué. Réessayez ou contactez le cabinet par téléphone.",
      });
      return;
    }

    res.json(SubmitContactAppointmentResponse.parse({ accepted: true }));
  } catch (error) {
    logger.error({ err: error }, "Could not reach Web3Forms");
    res.status(502).json({
      error: "L’envoi a échoué. Réessayez ou contactez le cabinet par téléphone.",
    });
  }
});

export default router;
