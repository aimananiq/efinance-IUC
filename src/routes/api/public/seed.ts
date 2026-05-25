import { createFileRoute } from "@tanstack/react-router";
import { seedDemoData } from "@/lib/seed.functions";

/** Public seed endpoint — idempotent, safe to call multiple times. */
export const Route = createFileRoute("/api/public/seed")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await seedDemoData();
          return new Response(JSON.stringify(result, null, 2), {
            headers: { "content-type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }, null, 2), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});