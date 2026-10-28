import express from "express";
import contactAppointmentRouter from "./routes/contact-appointment";

// Keep the retired CMS routes disabled. Only the validated appointment relay
// is exposed here; appointment requests are sent to Web3Forms, not stored.
const app = express();
app.use(express.json({ limit: "8kb" }));
app.get("/api/healthz", (_req, res) => res.json({ status: "retired", backend: "supabase" }));
app.use("/api", contactAppointmentRouter);
app.use((_req, res) => {
  res.status(410).json({ error: "Cette ancienne API est désactivée. Le cabinet utilise désormais Supabase." });
});
export default app;
