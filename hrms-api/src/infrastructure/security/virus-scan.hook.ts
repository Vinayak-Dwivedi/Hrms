import { env } from "@/env";
import { ApiError } from "@/middleware/error";

export interface VirusScanHook {
  scan(buffer: Buffer, filename: string): Promise<void>;
}

export class NoOpVirusScanHook implements VirusScanHook {
  async scan(): Promise<void> {
    // Pluggable hook for ClamAV or similar scanners in production.
  }
}

export function createVirusScanHook(): VirusScanHook {
  if (!env.VIRUS_SCAN_ENABLED) {
    return new NoOpVirusScanHook();
  }
  return new NoOpVirusScanHook();
}

export async function runVirusScan(
  hook: VirusScanHook,
  buffer: Buffer,
  filename: string,
): Promise<void> {
  try {
    await hook.scan(buffer, filename);
  } catch {
    throw new ApiError(400, "INFECTED_FILE", "File failed security scan.");
  }
}
