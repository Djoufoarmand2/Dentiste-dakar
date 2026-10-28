import express from "express";

// This legacy service is not required by the cabinet. If restarted, it must
// never expose the old, unfiltered JSON or revive Clerk-backed write routes.
const app = express();
app.get("/api/healthz", (_req, res) => res.json({ status: "retired", backend: "supabase" }));
app.use((_req, res) => {
  res.status(410).json({ error: "Cette ancienne API est désactivée. Le cabinet utilise désormais Supabase." });
});
export default app;
