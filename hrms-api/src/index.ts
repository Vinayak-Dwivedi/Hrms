import { createApp } from "@/app";
import { env } from "@/env";
import { ensureMaritalStatusEnum } from "@/lib/ensure-marital-status-enum";
import { startSecureyeTcpServer } from "@/modules/biometric/secureye-tcp.server";

const app = createApp();

async function start() {
  await ensureMaritalStatusEnum();

  const server = app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`[hrms-api] listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
    console.log(`[Health Check] http://localhost:${env.PORT}/api/health`);
  });

  // Secureye biometric TCP server (ZKTeco LogClient push protocol)
  const tcpServer = startSecureyeTcpServer(4370);

  function shutdown(signal: NodeJS.Signals) {
    console.log(`[hrms-api] ${signal} received, closing`);
    tcpServer.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void start().catch((e) => {
  console.error("[hrms-api] failed to start:", e);
  process.exit(1);
});
