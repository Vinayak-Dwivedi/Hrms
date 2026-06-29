/**
 * Secureye S-FB6K TCP server — ZKTeco LogClient push protocol.
 *
 * The device is configured with:
 *   Event Transfer Mode : TCP/IP
 *   Host PC Addr        : <EC2 IP>
 *   Host PC Port        : 4370
 *
 * Flow:
 *   1. Device boots → connects to this TCP server
 *   2. Device sends CMD_CONNECT (1000) with its serial number
 *   3. Server responds CMD_ACK_OK (2000) + sends CMD_REG_EVENT (500) to
 *      register for real-time attendance events
 *   4. Employee punches → device sends attendance record in real-time
 *   5. Server decodes, stores raw log, and upserts attendance_records
 */
import net from "net";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/runtime";
import { attendanceRecords, biometricRawLogs, employees } from "@/db/schema/hrms";

// ── ZKTeco protocol constants ────────────────────────────────────────────────

const CMD_CONNECT    = 1000;
const CMD_ACK_OK     = 2000;
const CMD_ACK_UNKNWN = 65535;
const CMD_ACK_ERROR  = 65533;
const CMD_REG_EVENT  = 500;
const CMD_ATTLOG     = 13;
const CMD_DEVICE     = 11;
const HEADER_LEN     = 8;

// ── Packet helpers ───────────────────────────────────────────────────────────

function computeChecksum(buf: Buffer): number {
  let c = 0;
  for (let i = 0; i < buf.length - 1; i += 2) c += buf.readUInt16LE(i);
  if (buf.length % 2) c += buf[buf.length - 1]!;
  c = (c >> 16) + (c & 0xffff);
  return (~c) & 0xffff;
}

function buildPacket(cmd: number, sessionId: number, replyId: number, payload = Buffer.alloc(0)): Buffer {
  const pkt = Buffer.alloc(HEADER_LEN + payload.length);
  pkt.writeUInt16LE(cmd, 0);
  pkt.writeUInt16LE(0, 2);           // checksum placeholder
  pkt.writeUInt16LE(sessionId, 4);
  pkt.writeUInt16LE(replyId, 6);
  payload.copy(pkt, HEADER_LEN);
  pkt.writeUInt16LE(computeChecksum(pkt), 2);
  return pkt;
}

function parseHeader(buf: Buffer) {
  if (buf.length < HEADER_LEN) return null;
  return {
    command:   buf.readUInt16LE(0),
    checksum:  buf.readUInt16LE(2),
    sessionId: buf.readUInt16LE(4),
    replyId:   buf.readUInt16LE(6),
    payload:   buf.subarray(HEADER_LEN),
  };
}

// ── Timestamp decoding ───────────────────────────────────────────────────────

/**
 * ZKTeco devices store timestamps as seconds since 2000-01-01 00:00:00
 * in the device's LOCAL timezone (IST = UTC+5:30 for India).
 *
 * 2000-01-01 00:00:00 IST  =  1999-12-31 18:30:00 UTC  =  unix 946645800
 */
function parseZKTime(raw: number): Date {
  // If it looks like a full unix timestamp (> 2009), treat as-is
  if (raw > 1_200_000_000) return new Date(raw * 1000);
  // Seconds since 2000-01-01 00:00:00 IST
  return new Date(946_645_800_000 + raw * 1000);
}

// ── Attendance record decoders ───────────────────────────────────────────────

type PunchRecord = { userId: string; punchTime: Date; punchType: number; verifyType: number };

/**
 * Attempt to decode an attendance record from a raw binary buffer.
 * ZKTeco firmware sends records in one of several layouts — try most common first.
 */
function decodeRecord(data: Buffer): PunchRecord | null {
  try {
    // Layout A (40 bytes) — common on ZK firmware 6.x+
    //   UserID(24) VerifyType(1) Time(4) AttState(1) WorkCode(1) Pad(9)
    if (data.length >= 40) {
      const userId = data.subarray(0, 24).toString("ascii").replace(/\0/g, "").trim();
      const verifyType = data.readUInt8(24);
      const timeRaw    = data.readUInt32LE(25);
      const punchType  = data.readUInt8(29);
      if (userId) return { userId, punchTime: parseZKTime(timeRaw), punchType, verifyType };
    }

    // Layout B (8 bytes) — older/compact firmware
    //   UserID(2 LE) Time(4 LE) AttState(1) VerifyType(1)
    if (data.length >= 8) {
      const userId     = data.readUInt16LE(0).toString();
      const timeRaw    = data.readUInt32LE(2);
      const punchType  = data.readUInt8(6);
      const verifyType = data.readUInt8(7);
      if (userId !== "0") return { userId, punchTime: parseZKTime(timeRaw), punchType, verifyType };
    }
  } catch { /* swallow — return null below */ }

  return null;
}

// ── DB helpers ───────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h = "0", m = "0"] = t.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function deriveStatus(mins: number): "Present" | "Half Day" | "Absent" {
  if (mins >= 480) return "Present";
  if (mins >= 240) return "Half Day";
  return "Absent";
}

async function upsertPunch(employeeId: number, dateStr: string, timeStr: string) {
  const [existing] = await db
    .select()
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, dateStr)));

  if (!existing) {
    await db.insert(attendanceRecords).values({
      employeeId, date: dateStr, punchIn: timeStr, punchOut: null, status: "Present", workingMinutes: 0,
    });
    return;
  }

  const isCheckIn = !existing.punchIn;
  if (isCheckIn) {
    const newPunchIn = !existing.punchIn || timeStr < existing.punchIn ? timeStr : existing.punchIn;
    await db.update(attendanceRecords)
      .set({ punchIn: newPunchIn, status: "Present", updatedAt: new Date() })
      .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, dateStr)));
  } else {
    const newPunchOut = !existing.punchOut || timeStr > existing.punchOut ? timeStr : existing.punchOut;
    let workingMinutes = existing.workingMinutes ?? 0;
    if (existing.punchIn && newPunchOut) {
      workingMinutes = Math.max(0, timeToMinutes(newPunchOut) - timeToMinutes(existing.punchIn));
    }
    await db.update(attendanceRecords)
      .set({ punchOut: newPunchOut, workingMinutes, status: deriveStatus(workingMinutes), updatedAt: new Date() })
      .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, dateStr)));
  }
}

async function processPunch(deviceSn: string, rec: PunchRecord) {
  // Resolve employee — device UserID may be bare number or with prefix
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(or(eq(employees.empId, rec.userId), eq(employees.empId, `IASPL${rec.userId}`)));

  // Store raw log — UNIQUE(device_sn, raw_user_id, punch_time) dedupes retries
  await db.insert(biometricRawLogs).values({
    deviceSn,
    employeeId: employee?.id ?? null,
    rawUserId:  rec.userId,
    punchTime:  rec.punchTime,
    punchType:  rec.punchType,
    verifyType: rec.verifyType,
  }).onConflictDoNothing();

  if (!employee) {
    console.warn(`[Secureye] unknown userId=${rec.userId} — raw log stored, skipping attendance`);
    return;
  }

  // Convert UTC punch time to IST for attendance date/time
  const IST_MS = (5 * 60 + 30) * 60_000;
  const ist     = new Date(rec.punchTime.getTime() + IST_MS);
  const dateStr = ist.toISOString().slice(0, 10);   // YYYY-MM-DD
  const timeStr = ist.toISOString().slice(11, 19);  // HH:mm:ss

  await upsertPunch(employee.id, dateStr, timeStr);
  console.log(`[Secureye] punch: empId=${rec.userId} date=${dateStr} time=${timeStr} type=${rec.punchType}`);
}

// ── TCP server ───────────────────────────────────────────────────────────────

export function startSecureyeTcpServer(port = 4370): net.Server {
  const server = net.createServer((socket) => {
    const addr      = `${socket.remoteAddress}:${socket.remotePort}`;
    const sessionId = Math.floor(Math.random() * 0xfffe) + 1;
    let deviceSn    = addr;
    let recvBuf     = Buffer.alloc(0);

    console.log(`[Secureye] device connected: ${addr}`);

    socket.on("data", (chunk) => {
      recvBuf = Buffer.concat([recvBuf, chunk]);

      while (recvBuf.length >= HEADER_LEN) {
        const pkt = parseHeader(recvBuf);
        if (!pkt) break;

        const { command, replyId, payload } = pkt;

        // Always log raw hex for debugging — remove once stable
        console.log(
          `[Secureye] ${addr} cmd=${command} payload(${payload.length}b): ${payload.subarray(0, 48).toString("hex")}`,
        );

        switch (command) {
          case CMD_CONNECT: {
            // Payload: device info string — SN is usually first tab-delimited field
            const info = payload.toString("ascii").replace(/\0/g, "").trim();
            if (info) deviceSn = info.split("\t")[0] ?? addr;
            console.log(`[Secureye] CONNECT from sn=${deviceSn}`);

            // 1. Acknowledge the connection
            socket.write(buildPacket(CMD_ACK_OK, sessionId, replyId));

            // 2. Register for ALL real-time events (0xFFFFFFFF = all flags)
            const mask = Buffer.alloc(4);
            mask.writeUInt32LE(0xffffffff, 0);
            socket.write(buildPacket(CMD_REG_EVENT, sessionId, replyId + 1, mask));
            break;
          }

          case CMD_ACK_OK:
          case CMD_ACK_UNKNWN:
          case CMD_ACK_ERROR:
            // Device acknowledging our packets — nothing to do
            break;

          case CMD_REG_EVENT: {
            // Real-time event from device — first 4 bytes = event type flags
            if (payload.length >= 4) {
              const flags   = payload.readUInt32LE(0);
              const attData = payload.subarray(4);
              console.log(`[Secureye] event flags=0x${flags.toString(16)} attData(${attData.length}b): ${attData.toString("hex")}`);

              if (attData.length > 0) {
                const rec = decodeRecord(attData);
                if (rec) {
                  void processPunch(deviceSn, rec).catch((e) =>
                    console.error("[Secureye] processPunch error:", e),
                  );
                } else {
                  console.warn(`[Secureye] could not decode record — raw: ${attData.toString("hex")}`);
                }
              }
            }
            socket.write(buildPacket(CMD_ACK_OK, sessionId, replyId));
            break;
          }

          case CMD_ATTLOG: {
            // Some firmware sends attendance as a direct ATTLOG command
            const rec = decodeRecord(payload);
            if (rec) {
              void processPunch(deviceSn, rec).catch((e) =>
                console.error("[Secureye] processPunch error:", e),
              );
            } else {
              console.warn(`[Secureye] ATTLOG decode failed — raw: ${payload.toString("hex")}`);
            }
            socket.write(buildPacket(CMD_ACK_OK, sessionId, replyId));
            break;
          }

          default:
            // Unknown command — always ACK to keep connection alive
            socket.write(buildPacket(CMD_ACK_OK, sessionId, replyId));
        }

        // Consume this packet. ZKTeco has no length field; each TCP "write"
        // from the device is one packet, so consume all of recvBuf per iteration.
        recvBuf = recvBuf.subarray(HEADER_LEN + payload.length);
        break;
      }
    });

    socket.on("error", (err) =>
      console.error(`[Secureye] socket error ${addr}: ${err.message}`),
    );
    socket.on("close", () => console.log(`[Secureye] disconnected: ${addr}`));
    socket.setTimeout(120_000, () => {
      console.log(`[Secureye] timeout ${addr}`);
      socket.destroy();
    });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[Secureye] TCP server listening on :${port}`);
  });

  server.on("error", (err) =>
    console.error(`[Secureye] server error: ${err.message}`),
  );

  return server;
}
