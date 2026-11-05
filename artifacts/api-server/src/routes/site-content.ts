import { clerkClient, getAuth } from "@clerk/express";
import {
  GetAdminAccessResponse,
  GetSiteContentResponse,
  UpdateSiteContentBody,
} from "@workspace/api-zod";
import { createClient } from "@supabase/supabase-js";
import { Router, type IRouter } from "express";
import { defaultSiteContent } from "../lib/siteContentDefaults";

const router: IRouter = Router();
const bucketName = "cabinet-site-content";
const contentObjectPath = "cms/site-content.json";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let bucketReady: Promise<void> | undefined;

async function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;

      if (!data.some((bucket) => bucket.name === bucketName)) {
        const { error: createError } = await supabase.storage.createBucket(
          bucketName,
          { public: false },
        );
        if (createError && !createError.message.toLowerCase().includes("already exists")) {
          throw createError;
        }
      }
    })();
  }

  try {
    await bucketReady;
  } catch (error) {
    bucketReady = undefined;
    throw error;
  }
}

async function storeSiteContent(content: unknown): Promise<void> {
  await ensureBucket();
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(contentObjectPath, JSON.stringify(content), {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });

  if (error) throw error;
}

async function loadSiteContent() {
  await ensureBucket();
  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(contentObjectPath);

  if (error) {
    const missingObject =
      error.statusCode === "404" ||
      error.message.toLowerCase().includes("not found");
    if (!missingObject) throw error;

    await storeSiteContent(defaultSiteContent);
    return defaultSiteContent;
  }

  return GetSiteContentResponse.parse(JSON.parse(await data.text()));
}

async function isConfiguredAdministrator(userId: string): Promise<boolean> {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredEmail) return false;

  const user = await clerkClient.users.getUser(userId);
  return user.primaryEmailAddress?.emailAddress.toLowerCase() === configuredEmail;
}

router.get("/site-content", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const content = await loadSiteContent();
    res.json(GetSiteContentResponse.parse(content));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load site content");
    res.status(503).json({ error: "Le contenu du site est temporairement indisponible." });
  }
});

router.get("/admin/access", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Connexion requise." });
    return;
  }

  try {
    const response = GetAdminAccessResponse.parse({
      isAdmin: await isConfiguredAdministrator(userId),
    });
    res.json(response);
  } catch (error) {
    req.log.error({ err: error }, "Failed to check administrator access");
    res.status(503).json({ error: "Impossible de vérifier les droits administrateur." });
  }
});

router.put("/site-content", async (req, res): Promise<void> => {
  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    res.status(403).json({ error: "Origine non autorisée." });
    return;
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Connexion requise." });
    return;
  }

  try {
    if (!(await isConfiguredAdministrator(userId))) {
      res.status(403).json({ error: "Accès réservé à l’administrateur du cabinet." });
      return;
    }

    const parsed = UpdateSiteContentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const content = GetSiteContentResponse.parse(parsed.data);
    await storeSiteContent(content);
    res.setHeader("Cache-Control", "no-store");
    res.json(content);
  } catch (error) {
    req.log.error({ err: error }, "Failed to save site content");
    res.status(503).json({ error: "Impossible d’enregistrer les modifications." });
  }
});

export default router;
