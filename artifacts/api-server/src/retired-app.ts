import express from "express";

// The retired API no longer handles CMS or appointment submissions.
const app = express();
app.use(express.json({ limit: "8kb" }));
app.get("/api/healthz", (_req, res) => res.json({ status: "retired", backend: "supabase" }));
app.use((_req, res) => {
  res.status(410).json({ error: "Cette ancienne API est désactivée. Le cabinet utilise désormais Supabase." });
});
export default app;
