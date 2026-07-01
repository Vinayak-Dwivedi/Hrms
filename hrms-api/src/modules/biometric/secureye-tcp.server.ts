/**
 * Secureye M50 TCP server — XML push protocol (LogClient mode) with
 * ZKTeco binary fallback for older Secureye models.
 *
 * The M50 in LogClient mode sends XML over TCP on port 4370:
 *
 *   Device → Server  (handshake):
 *     <?xml version="1.0"?><Message><TerminalType>M50</TerminalType>
 *       <SN>SERIAL</SN>...</Message>
 *
 *   Server → Device  (ack):
 *     <?xml version="1.0"?><Message><CMD>ACK_SUCCESS</CMD></Message>
 *
 *   Device → Server  (attendance punch):
 *     <?xml version="1.0"?><Message><CMD>attendance</CMD>
 *       <UserID>1</UserID><Time>2024-01-01 09:00:00</Time>
 *       <PunchType>0</PunchType><VerifyType>1</VerifyType></Message>
 *
 * Protocol is auto-detected: first byte '<' → XML; anything else → binary.
 */
import net from "net";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/runtime";
import { attendanceRecords, biometricRawLogs, employees } from "@/db/schema/hrms";

// ── ZKTeco binary protocol constants ─────────────────────────────────────────

const CMD_CONNECT    = 1000;
const CMD_ACK_OK     = 2000;
const CMD_ACK_UNKNWN = 65535;
const CMD_ACK_ERROR  = 65533;
const CMD_REG_EVENT  = 500;
const CMD_ATTLOG     = 13;
const HEADER_LEN     = 8;

// ── Binary packet helpers ─────────────────────────────────────────────────────

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
  pkt.writeUInt16LE(0, 2);
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

// ── ZKTeco timestamp decoder ──────────────────────────────────────────────────

function parseZKTime(raw: number): Date {
  // Full unix timestamp
  if (raw > 1_200_000_000) return new Date(raw * 1000);
  // Seconds since 2000-01-01 00:00:00 IST (= 1999-12-31 18:30:00 UTC)
  return new Date(946_645_800_000 + raw * 1000);
}

// ── ZKTeco attendance record decoder ─────────────────────────────────────────

type PunchRecord = { userId: string; punchTime: Date; punchType: number; verifyType: number };

function decodeRecord(data: Buffer): PunchRecord | null {
  try {
    // Layout A (40 bytes) — ZK firmware 6.x+
    if (data.length >= 40) {
      const userId    = data.subarray(0, 24).toString("ascii").replace(/\0/g, "").trim();
      const verifyType = data.readUInt8(24);
      const timeRaw   = data.readUInt32LE(25);
      const punchType = data.readUInt8(29);
      if (userId) return { userId, punchTime: parseZKTime(timeRaw), punchType, verifyType };
    }
    // Layout B (8 bytes) — older/compact firmware
    if (data.length >= 8) {
      const userId    = data.readUInt16LE(0).toString();
      const timeRaw   = data.readUInt32LE(2);
      const punchType = data.readUInt8(6);
      const verifyType = data.readUInt8(7);
      if (userId !== "0") return { userId, punchTime: parseZKTime(timeRaw), punchType, verifyType };
    }
  } catch { /* swallow — return null below */ }
  return null;
}

// ── XML helpers ───────────────────────────────────────────────────────────────

const XML_ACK = '<?xml version="1.0"?><Message><CMD>ACK_SUCCESS</CMD></Message>';
const XML_MSG_END = "</Message>";

function xmlTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
  return m?.[1]?.trim() ?? "";
}

// ── DB helpers ────────────────────────────────────────────────────────────────

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
    if (existing.punchIn && newPunchOut <= existing.punchIn) {
      console.warn(`[Secureye] skipping punchOut=${newPunchOut} ≤ punchIn=${existing.punchIn} for emp=${employeeId} date=${dateStr}`);
      return;
    }
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
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(or(eq(employees.empId, rec.userId), eq(employees.empId, `IASPL${rec.userId}`)));

  await db.insert(biometricRawLogs).values({
    deviceSn,
    employeeId: employee?.id ?? null,
    rawUserId:  rec.userId,
    punchTime:  rec.punchTime,
    punchType:  rec.punchType,
    verifyType: rec.verifyType,
  }).onConflictDoNothing();

  if (!employee) {
    console.warn(`[Secureye] unknown userId=${rec.userId} — raw log stored`);
    return;
  }

  // rec.punchTime is UTC — add IST offset to get display strings
  const IST_MS = (5 * 60 + 30) * 60_000;
  const ist    = new Date(rec.punchTime.getTime() + IST_MS);
  const dateStr = ist.toISOString().slice(0, 10);  // YYYY-MM-DD
  const timeStr = ist.toISOString().slice(11, 19); // HH:mm:ss

  await upsertPunch(employee.id, dateStr, timeStr);
  console.log(`[Secureye] punch: empId=${rec.userId} date=${dateStr} time=${timeStr} type=${rec.punchType}`);
}

// ── XML message handler (M50 LogClient protocol) ──────────────────────────────

async function handleXmlMessage(
  xml: string,
  deviceSnRef: { value: string },
  socket: net.Socket,
) {
  const cmd          = xmlTag(xml, "CMD");
  const terminalType = xmlTag(xml, "TerminalType");

  // Extract serial number — M50 firmware uses different tag names
  const sn =
    xmlTag(xml, "SN") ||
    xmlTag(xml, "SerialNumber") ||
    xmlTag(xml, "DeviceID") ||
    xmlTag(xml, "DeviceSN");
  if (sn) deviceSnRef.value = sn;

  // Handshake / registration message
  if (terminalType || cmd === "reg" || cmd === "connect" || cmd === "handshake") {
    console.log(`[Secureye] M50 connected sn=${deviceSnRef.value} type=${terminalType}`);
    socket.write(XML_ACK);
    return;
  }

  // Heartbeat — keep connection alive
  if (cmd === "hb" || cmd === "heartbeat" || cmd === "ping") {
    socket.write(XML_ACK);
    return;
  }

  // Attendance record — M50 firmware uses various field names
  const userId =
    xmlTag(xml, "UserID") ||
    xmlTag(xml, "UserId") ||
    xmlTag(xml, "PIN");
  const timeStr =
    xmlTag(xml, "Time") ||
    xmlTag(xml, "DateTime") ||
    xmlTag(xml, "LogTime");

  if (userId && timeStr) {
    const punchType = parseInt(
      xmlTag(xml, "PunchType") || xmlTag(xml, "AttState") || xmlTag(xml, "InOutMode") || "0",
      10,
    );
    const verifyType = parseInt(
      xmlTag(xml, "VerifyType") || xmlTag(xml, "Verify") || "1",
      10,
    );
    // Device sends local IST time — parse with +05:30 so Date is correct UTC
    const punchTime = new Date(timeStr.replace(" ", "T") + "+05:30");
    await processPunch(deviceSnRef.value, { userId, punchTime, punchType, verifyType });
  } else {
    // Unknown / informational message — log for debugging
    console.log(`[Secureye] M50 msg cmd=${cmd || "(none)"}: ${xml.substring(0, 300)}`);
  }

  socket.write(XML_ACK);
}

// ── TCP server ────────────────────────────────────────────────────────────────

export function startSecureyeTcpServer(port = 4370): net.Server {
  const server = net.createServer((socket) => {
    const addr      = `${socket.remoteAddress}:${socket.remotePort}`;
    const sessionId = Math.floor(Math.random() * 0xfffe) + 1;
    // Use object ref so XML handler can mutate sn in-place
    const deviceSnRef = { value: socket.remoteAddress ?? addr };
    let recvBuf = Buffer.alloc(0);
    // null = not yet determined; true = XML (M50); false = ZKTeco binary
    let isXml: boolean | null = null;

    console.log(`[Secureye] device connected: ${addr}`);

    socket.on("data", (chunk) => {
      recvBuf = Buffer.concat([recvBuf, chunk]);

      // Auto-detect protocol from first byte: '<' = XML (M50), else binary
      if (isXml === null && recvBuf.length > 0) {
        isXml = recvBuf[0] === 0x3c; // ASCII '<'
        if (isXml) {
          console.log(`[Secureye] ${addr} detected XML protocol (M50)`);
        }
      }

      // ── XML protocol (Secureye M50 LogClient) ──────────────────────────────
      if (isXml) {
        let str = recvBuf.toString("utf8");
        let endPos: number;
        while ((endPos = str.indexOf(XML_MSG_END)) !== -1) {
          const msg = str.substring(0, endPos + XML_MSG_END.length);
          str = str.substring(endPos + XML_MSG_END.length);
          void handleXmlMessage(msg, deviceSnRef, socket).catch((e) =>
            console.error("[Secureye] XML handler error:", e),
          );
        }
        recvBuf = Buffer.from(str, "utf8");
        return;
      }

      // ── Binary protocol (ZKTeco LogClient fallback) ────────────────────────
      while (recvBuf.length >= HEADER_LEN) {
        const pkt = parseHeader(recvBuf);
        if (!pkt) break;

        const { command, replyId, payload } = pkt;

        console.log(
          `[Secureye] ${addr} cmd=${command} payload(${payload.length}b): ${payload.subarray(0, 48).toString("hex")}`,
        );

        switch (command) {
          case CMD_CONNECT: {
            const info = payload.toString("ascii").replace(/\0/g, "").trim();
            if (info) deviceSnRef.value = info.split("\t")[0] ?? addr;
            console.log(`[Secureye] CONNECT sn=${deviceSnRef.value}`);
            socket.write(buildPacket(CMD_ACK_OK, sessionId, replyId));
            // Register for all real-time events
            const mask = Buffer.alloc(4);
            mask.writeUInt32LE(0xffffffff, 0);
            socket.write(buildPacket(CMD_REG_EVENT, sessionId, replyId + 1, mask));
            break;
          }

          case CMD_ACK_OK:
          case CMD_ACK_UNKNWN:
          case CMD_ACK_ERROR:
            // Device acknowledging our packets
            break;

          case CMD_REG_EVENT: {
            if (payload.length >= 4) {
              const flags   = payload.readUInt32LE(0);
              const attData = payload.subarray(4);
              console.log(`[Secureye] event flags=0x${flags.toString(16)} attData(${attData.length}b): ${attData.toString("hex")}`);
              if (attData.length > 0) {
                const rec = decodeRecord(attData);
                if (rec) {
                  void processPunch(deviceSnRef.value, rec).catch((e) =>
                    console.error("[Secureye] processPunch error:", e),
                  );
                } else {
                  console.warn(`[Secureye] ATTLOG decode failed — raw: ${attData.toString("hex")}`);
                }
              }
            }
            socket.write(buildPacket(CMD_ACK_OK, sessionId, replyId));
            break;
          }

          case CMD_ATTLOG: {
            const rec = decodeRecord(payload);
            if (rec) {
              void processPunch(deviceSnRef.value, rec).catch((e) =>
                console.error("[Secureye] processPunch error:", e),
              );
            } else {
              console.warn(`[Secureye] ATTLOG decode failed — raw: ${payload.toString("hex")}`);
            }
            socket.write(buildPacket(CMD_ACK_OK, sessionId, replyId));
            break;
          }

          default:
            // Unknown command — ACK to keep connection alive
            socket.write(buildPacket(CMD_ACK_OK, sessionId, replyId));
        }

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
