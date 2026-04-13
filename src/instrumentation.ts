/**
 * Next.js instrumentation hook — runs once on server startup.
 * Triggers session reconnect via internal API call after server is ready.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Wait for server to be fully ready before calling API
  await new Promise((r) => setTimeout(r, 6000));

  const port = process.env.PORT ?? 3000;
  const secret = process.env.INTERNAL_STARTUP_SECRET ?? "wa-crm-startup";

  fetch(`http://localhost:${port}/api/sessions/startup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-startup-secret": secret,
    },
  })
    .then((r) => r.json())
    .then((data) => console.log("[startup] Reconnect result:", data))
    .catch((err) => console.error("[startup] Reconnect failed:", (err as Error).message));
}
