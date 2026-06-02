import { createApp } from "@/app";
import { env } from "@/env";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[hrms-api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`[hrms-api] ${signal} received, closing`);
  server.close(() => process.exit(0));
  // safety net
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
