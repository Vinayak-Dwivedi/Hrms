/**
 * ESSL ADMS / ICLOCK push protocol handler.
 *
 * The biometric device is configured with Cloud Server Settings (ADMS mode).
 * It calls these endpoints to register itself and push attendance punch logs
 * in real time. No auth token is required — device cannot authenticate.
 *
 * Flow:
 *   1. Device powers on → GET /iclock/cdata  (handshake)
 *   2. Employee punches  → POST /iclock/cdata?table=ATTLOG (push log)
 *   3. Device polls      → GET /iclock/getrequest (pending commands)
 */
import express, { Router } from "express";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/runtime";
import { attendanceRecords, biometricRawLogs, employees } from "@/db/schema/hrms";

export const iclockRouter: Router = Router();

// ICLOCK sends plain-text bodies; parse before any handler runs.
iclockRouter.use(express.text({ type: "*/*", limit: "1mb" }));

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const parts = t.split(":");
  return parseInt(parts[0] ?? "0", 10) * 60 + parseInt(parts[1] ?? "0", 10);
}

function deriveStatus(
  workingMinutes: number,
): "Present" | "Half Day" | "Absent" {
  if (workingMinutes >= 480) return "Present";
  if (workingMinutes >= 240) return "Half Day";
  return "Absent";
}

async function upsertAttendancePunch(
  employeeId: number,
  dateStr: string,   // "YYYY-MM-DD"
  timeStr: string,   // "HH:mm:ss"
  isCheckIn: boolean,
) {
  const [existing] = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.date, dateStr),
      ),
    );

  if (!existing) {
    await db.insert(attendanceRecords).values({
      employeeId,
      date: dateStr,
      punchIn: isCheckIn ? timeStr : null,
      punchOut: isCheckIn ? null : timeStr,
      status: "Present",
      workingMinutes: 0,
    });
    return;
  }

  if (isCheckIn) {
    const newPunchIn =
      !existing.punchIn || timeStr < existing.punchIn
        ? timeStr
        : existing.punchIn;
    await db
      .update(attendanceRecords)
      .set({ punchIn: newPunchIn, status: "Present", updatedAt: new Date() })
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.date, dateStr),
        ),
      );
  } else {
    const newPunchOut =
      !existing.punchOut || timeStr > existing.punchOut
        ? timeStr
        : existing.punchOut;

    let workingMinutes = existing.workingMinutes ?? 0;
    if (existing.punchIn && newPunchOut) {
      workingMinutes = Math.max(
        0,
        timeToMinutes(newPunchOut) - timeToMinutes(existing.punchIn),
      );
    }

    await db
      .update(attendanceRecords)
      .set({
        punchOut: newPunchOut,
        workingMinutes,
        status: deriveStatus(workingMinutes),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.date, dateStr),
        ),
      );
  }
}

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /iclock/cdata
 * Device handshake — called when device boots or reconnects.
 * Responds with plain-text configuration options the device will apply.
 */
iclockRouter.get(["/cdata", "/cdata.aspx"], (req, res) => {
  const sn = req.query["SN"] as string | undefined;
  if (!sn) return res.status(400).send("ERROR");

  console.log(`[ESSL] device connected  sn=${sn}`);

  res.set("Content-Type", "text/plain").send(
    [
      `GET OPTION FROM: ${sn}`,
      "ATTLOGStamp=0",
      "OPERLOGStamp=9999",
      "ErrorDelay=30",
      "Delay=20",
      "TransTimes=00:00;06:00",
      "TransInterval=1",
      "TransFlag=10111110",
      "TimeZone=8",
      "Realtime=1",
      "EncryptionMode=0",
    ].join("\n"),
  );
});

/**
 * POST /iclock/cdata?table=ATTLOG
 * Device pushes attendance punch records.
 *
 * Body format (tab-separated, one record per line):
 *   ATTLOG  <UserID>  <YYYY-MM-DD HH:mm:ss>  <PunchType>  <Verify>  0  0
 *
 * PunchType: 0=Check-In, 1=Check-Out, 2=Break-Out, 3=Break-In, 4=OT-In, 5=OT-Out
 */
iclockRouter.post(["/cdata", "/cdata.aspx"], async (req, res, next) => {
  try {
    const sn = req.query["SN"] as string | undefined;
    const table = req.query["table"] as string | undefined;

    if (!sn) return res.status(400).send("ERROR");

    // Only process attendance log pushes.
    if (table !== "ATTLOG") {
      return res.set("Content-Type", "text/plain").send("OK: 0");
    }

    const body = typeof req.body === "string" ? req.body : "";
    const lines = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("ATTLOG"));

    let processed = 0;

    for (const line of lines) {
      // Fields: ATTLOG \t UserID \t DateTime \t PunchType \t Verify \t WorkCode \t Reserved
      const parts = line.split("\t");
      const rawUserId = parts[1]?.trim();
      const rawDateTime = parts[2]?.trim(); // "2024-06-22 09:15:23"
      const punchType = parseInt(parts[3] ?? "0", 10);
      const verifyType = parseInt(parts[4] ?? "1", 10);

      if (!rawUserId || !rawDateTime) continue;

      // Parse date and time directly from the string (device sends local IST time).
      const [datePart, timePart] = rawDateTime.split(" ");
      const dateStr = datePart ?? "";
      const timeStr = (timePart ?? "").slice(0, 8); // "HH:mm:ss"

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !timeStr) continue;

      // Resolve employee (biometric UserID = employee empId code).
      const [employee] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(or(eq(employees.empId, rawUserId), eq(employees.empId, `IASPL${rawUserId}`)));

      // Store raw log — UNIQUE on (device_sn, raw_user_id, punch_time) so
      // duplicate pushes from device retries are silently ignored.
      const punchTime = new Date(`${dateStr}T${timeStr}+05:30`); // treat as IST
      try {
        await db
          .insert(biometricRawLogs)
          .values({
            deviceSn: sn,
            employeeId: employee?.id ?? null,
            rawUserId,
            punchTime,
            punchType,
            verifyType,
          })
          .onConflictDoNothing();
      } catch {
        // Duplicate — already stored, skip processing.
        processed++;
        continue;
      }

      // Can't update attendance without a matched employee.
      if (!employee) {
        console.warn(`[ESSL] unknown empId=${rawUserId} — raw log stored`);
        processed++;
        continue;
      }

      // PunchType 0/2/4 = entering direction; 1/3/5 = leaving direction.
      const isCheckIn = [0, 2, 4].includes(punchType);
      await upsertAttendancePunch(employee.id, dateStr, timeStr, isCheckIn);

      processed++;
    }

    console.log(`[ESSL] sn=${sn} processed=${processed}/${lines.length}`);
    res.set("Content-Type", "text/plain").send(`OK: ${processed}`);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /iclock/getrequest
 * Device polls for pending commands (e.g. enroll user, delete user).
 * Respond "OK" when there are no commands queued.
 */
iclockRouter.get(["/getrequest", "/getrequest.aspx"], (req, res) => {
  res.set("Content-Type", "text/plain").send("OK");
});

/**
 * POST /iclock/devicecmd
 * Device acknowledges that it executed a command we sent.
 */
iclockRouter.post(["/devicecmd", "/devicecmd.aspx"], (_req, res) => {
  res.set("Content-Type", "text/plain").send("OK");
});
