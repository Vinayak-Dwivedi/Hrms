import { Router } from "express";
import multer from "multer";
import * as xlsx from "xlsx";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  attendance,
  attendanceRecords,
  attendanceUploads,
  employees,
} from "@/db/schema/hrms";
import {
  deriveAttendanceStatus,
  formatDateYmd,
  parseExcelDate,
  parseTime,
  punchOutForRecord,
  resolveWorkingMinutes,
} from "@/lib/attendance-import";
import {
  emptyAttendanceDayContext,
  loadAttendanceDayContextBatch,
  resolveAttendanceStatusForDate,
} from "@/lib/attendance-status";
import { startEndOfMonth } from "@/lib/employee";
import { requirePermission } from "@/middleware/require-permission";
import { and, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";

export const attendanceRouter: Router = Router();

const uploadAttendance = requirePermission("attendance.upload");

const listUploadsQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

function monthDateRange(month: string): { from: string; to: string } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const mon = Number(monthStr);
  const lastDay = new Date(year, mon, 0).getDate();
  return {
    from: `${yearStr}-${monthStr}-01`,
    to: `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

function buildUploadListFilters(query: z.infer<typeof listUploadsQuerySchema>) {
  const filters = [];
  if (query.date) {
    filters.push(eq(attendanceUploads.attendanceDate, query.date));
  } else if (query.fromDate || query.toDate) {
    if (query.fromDate) {
      filters.push(gte(attendanceUploads.attendanceDate, query.fromDate));
    }
    if (query.toDate) {
      filters.push(lte(attendanceUploads.attendanceDate, query.toDate));
    }
  } else if (query.month) {
    const { from, to } = monthDateRange(query.month);
    filters.push(gte(attendanceUploads.attendanceDate, from));
    filters.push(lte(attendanceUploads.attendanceDate, to));
  }
  if (query.search) {
    filters.push(ilike(attendanceUploads.employeeCode, `%${query.search}%`));
  }
  return filters.length > 0 ? and(...filters) : undefined;
}

function resolveUploadListDateRange(
  query: z.infer<typeof listUploadsQuerySchema>,
  rowDates: string[],
): { fromDate: string; toDate: string } {
  if (query.date) {
    return { fromDate: query.date, toDate: query.date };
  }
  if (query.fromDate || query.toDate) {
    const from = query.fromDate ?? query.toDate!;
    const to = query.toDate ?? query.fromDate!;
    return { fromDate: from, toDate: to };
  }
  if (query.month) {
    const { from, to } = monthDateRange(query.month);
    return { fromDate: from, toDate: to };
  }
  if (rowDates.length > 0) {
    const sorted = [...rowDates].sort();
    return { fromDate: sorted[0]!, toDate: sorted[sorted.length - 1]! };
  }
  const now = new Date();
  const { start, end } = startEndOfMonth(now.getFullYear(), now.getMonth());
  return { fromDate: start, toDate: end };
}

async function resolveEmployeeIdsByCode(
  codes: string[],
): Promise<Map<string, number>> {
  const normalized = [...new Set(codes.map((c) => c.trim().toLowerCase()))];
  if (normalized.length === 0) return new Map();

  const empRows = await db
    .select({ id: employees.id, empId: employees.empId })
    .from(employees)
    .where(
      sql`lower(trim(${employees.empId})) in (${sql.join(
        normalized.map((c) => sql`${c}`),
        sql`, `,
      )})`,
    );

  const map = new Map<string, number>();
  for (const row of empRows) {
    map.set(row.empId.trim().toLowerCase(), row.id);
  }
  return map;
}

attendanceRouter.get("/uploads", uploadAttendance, async (req, res, next) => {
  try {
    const query = listUploadsQuerySchema.parse(req.query);
    const whereClause = buildUploadListFilters(query);
    const offset = (query.page - 1) * query.limit;

    const baseQuery = db
      .select({
        id: attendanceUploads.id,
        employeeCode: attendanceUploads.employeeCode,
        attendanceDate: attendanceUploads.attendanceDate,
        inTime: attendanceUploads.inTime,
        outTime: attendanceUploads.outTime,
        totalHours: attendanceUploads.totalHours,
        uploadedAt: attendanceUploads.createdAt,
        fileName: sql<string>`''`,
      })
      .from(attendanceUploads);

    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceUploads);

    const [rows, countRows] = await Promise.all([
      (whereClause ? baseQuery.where(whereClause) : baseQuery)
        .orderBy(desc(attendanceUploads.attendanceDate), desc(attendanceUploads.id))
        .limit(query.limit)
        .offset(offset),
      whereClause ? countQuery.where(whereClause) : countQuery,
    ]);

    const { fromDate, toDate } = resolveUploadListDateRange(
      query,
      rows.map((r) => r.attendanceDate),
    );
    const codeToEmployeeId = await resolveEmployeeIdsByCode(
      rows.map((r) => r.employeeCode),
    );
    const employeeIds = [
      ...new Set(
        rows
          .map((r) => codeToEmployeeId.get(r.employeeCode.trim().toLowerCase()))
          .filter((id): id is number => id != null),
      ),
    ];
    const dayContextMap = await loadAttendanceDayContextBatch(
      employeeIds,
      fromDate,
      toDate,
    );

    const enrichedRows = rows.map((row) => {
      const employeeId = codeToEmployeeId.get(
        row.employeeCode.trim().toLowerCase(),
      );
      const dayContext = employeeId
        ? (dayContextMap.get(employeeId) ?? emptyAttendanceDayContext())
        : emptyAttendanceDayContext();
      const attendanceStatus = resolveAttendanceStatusForDate(
        row.attendanceDate,
        {
          inTime: row.inTime,
          outTime: row.outTime,
          totalHours: row.totalHours,
        },
        dayContext,
      );
      return { ...row, attendanceStatus };
    });

    res.json({
      rows: enrichedRows,
      total: countRows[0]?.count ?? 0,
      page: query.page,
      limit: query.limit,
    });
  } catch (err: unknown) {
    next(err);
  }
});

// [AI_PROD_NOTE]: For Excel bulk uploads, memoryStorage is perfect even in production (AWS EC2).
// The file is small, kept in RAM, parsed, and immediately garbage collected.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const legacyUploadRowSchema = z.object({
  Location: z.union([z.string(), z.number()]).optional(),
  Date: z.union([z.string(), z.number()]),
  "EMP Code": z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  "Emp Name": z.union([z.string(), z.number()]).optional(),
  "In Time": z.union([z.string(), z.number()]).optional(),
  "Out Time": z.union([z.string(), z.number()]).optional(),
  "Work Hrs": z.union([z.string(), z.number()]).optional(),
});

const attendanceUploadRowSchema = z.object({
  Month: z.union([z.string(), z.number()]).optional(),
  Location: z.union([z.string(), z.number()]).optional(),
  Date: z.union([z.string(), z.number()]),
  Day: z.union([z.string(), z.number()]).optional(),
  "Week Wise": z.union([z.string(), z.number()]).optional(),
  "EMP Code": z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  "Card No": z.union([z.string(), z.number()]).optional(),
  "Emp Name": z.union([z.string(), z.number()]).optional(),
  Status: z.union([z.string(), z.number()]).optional(),
  Shift: z.union([z.string(), z.number()]).optional(),
  "In Time": z.union([z.string(), z.number()]).optional(),
  "Out Time": z.union([z.string(), z.number()]).optional(),
  "Shift Hrs": z.union([z.string(), z.number()]).optional(),
  "Wrk Hrs": z.union([z.string(), z.number()]).optional(),
  Designation: z.union([z.string(), z.number()]).optional(),
  Department: z.union([z.string(), z.number()]).optional(),
});

type RowError = { row: number; error: string };

async function resolveEmployeeMap(
  employeeCodes: Set<string>,
  empNames: Map<string, string>,
): Promise<{ empMap: Map<string, number>; createdCount: number }> {
  const empCodeArray = Array.from(employeeCodes);
  const matchedEmployees = await db
    .select({ id: employees.id, empId: employees.empId })
    .from(employees)
    .where(inArray(employees.empId, empCodeArray));

  const empMap = new Map<string, number>();
  for (const e of matchedEmployees) {
    empMap.set(e.empId, e.id);
  }

  const missingCodes = empCodeArray.filter((code) => !empMap.has(code));
  let createdCount = 0;
  if (missingCodes.length > 0) {
    const stubRows = missingCodes.map((code) => {
      const fullName = (empNames.get(code) || code).trim();
      const tokens = fullName.split(/\s+/);
      const firstName = (tokens[0] || code).slice(0, 100);
      const lastName = tokens.slice(1).join(" ").slice(0, 100);
      return {
        empId: code.slice(0, 20),
        firstName,
        lastName,
        personalEmail: `${code.toLowerCase()}@import.local`,
        phone: "0000000000",
        dob: "1990-01-01",
        gender: "Other" as const,
        joiningDate: "2020-01-01",
        passwordHash: "IMPORT_NO_LOGIN",
      };
    });
    const inserted = await db
      .insert(employees)
      .values(stubRows)
      .returning({ id: employees.id, empId: employees.empId });
    for (const e of inserted) empMap.set(e.empId, e.id);
    createdCount = inserted.length;
  }

  return { empMap, createdCount };
}

function readExcelRows(buffer: Buffer): Record<string, unknown>[] {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    throw new Error("Excel file has no readable sheet.");
  }
  return xlsx.utils.sheet_to_json(sheet) as Record<string, unknown>[];
}

attendanceRouter.post("/upload-bulk", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: "No file uploaded" } });
    }

    const rawData = readExcelRows(req.file.buffer);

    if (rawData.length === 0) {
      return res.status(400).json({ error: { message: "Excel file is empty or formatted incorrectly." } });
    }

    const errors: RowError[] = [];
    const validRows: Array<{ rowNum: number; data: z.infer<typeof legacyUploadRowSchema> }> = [];
    const employeeCodes = new Set<string>();
    const empNames = new Map<string, string>();

    for (let i = 0; i < rawData.length; i++) {
      const rowNum = i + 2;
      const parsed = legacyUploadRowSchema.safeParse(rawData[i]);

      if (!parsed.success) {
        errors.push({
          row: rowNum,
          error: `Missing required column: ${parsed.error.issues[0]?.path.join(".") ?? "unknown"}`,
        });
        continue;
      }
      validRows.push({ rowNum, data: parsed.data });
      employeeCodes.add(parsed.data["EMP Code"]);
      const name = parsed.data["Emp Name"];
      if (name !== undefined && !empNames.has(parsed.data["EMP Code"])) {
        empNames.set(parsed.data["EMP Code"], String(name).trim());
      }
    }

    if (employeeCodes.size === 0) {
      return res.status(400).json({ error: { message: "No valid rows found in the sheet", details: errors } });
    }

    const { empMap, createdCount } = await resolveEmployeeMap(employeeCodes, empNames);

    const insertRecords: Array<{
      employeeId: number;
      date: string;
      punchIn: string | null;
      punchOut: string | null;
      workingMinutes: number;
      status: "Present" | "Absent" | "Half Day" | "Leave" | "Holiday" | "Weekend";
      location: string | null;
      isRegularised: boolean;
    }> = [];

    for (const { rowNum, data } of validRows) {
      const employeeId = empMap.get(data["EMP Code"]);
      if (!employeeId) {
        errors.push({ row: rowNum, error: `Employee Code '${data["EMP Code"]}' not found in database` });
        continue;
      }

      let dateObj: Date;
      try {
        dateObj = parseExcelDate(data.Date);
        if (isNaN(dateObj.getTime())) throw new Error();
      } catch {
        errors.push({ row: rowNum, error: "Invalid date format" });
        continue;
      }

      const dateStr = formatDateYmd(dateObj);
      const punchIn = parseTime(data["In Time"]);
      const punchOutRaw = parseTime(data["Out Time"]);
      const workingMinutes = resolveWorkingMinutes(punchIn, punchOutRaw, data["Work Hrs"]);
      const punchOut = punchOutForRecord(punchIn, punchOutRaw);
      const status = deriveAttendanceStatus(workingMinutes);

      insertRecords.push({
        employeeId,
        date: dateStr,
        punchIn,
        punchOut,
        workingMinutes,
        status,
        location: data.Location ? String(data.Location) : null,
        isRegularised: false,
      });
    }

    if (insertRecords.length > 0) {
      await db.transaction(async (tx) => {
        for (const record of insertRecords) {
          await tx
            .insert(attendanceRecords)
            .values(record)
            .onConflictDoUpdate({
              target: [attendanceRecords.employeeId, attendanceRecords.date],
              set: {
                punchIn: record.punchIn,
                punchOut: record.punchOut,
                workingMinutes: record.workingMinutes,
                status: record.status,
                location: record.location,
                updatedAt: new Date(),
              },
            });
        }
      });
    }

    res.json({
      success: true,
      message: "Bulk upload processed",
      inserted: insertRecords.length,
      employeesCreated: createdCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    next(err);
  }
});

attendanceRouter.post(
  "/upload",
  uploadAttendance,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: { message: "No file uploaded" } });
      }

      let rawData: Record<string, unknown>[];
      try {
        rawData = readExcelRows(req.file.buffer);
      } catch (e) {
        return res.status(400).json({
          error: { message: e instanceof Error ? e.message : "Failed to read Excel file." },
        });
      }

      if (rawData.length === 0) {
        return res.status(400).json({ error: { message: "Excel file is empty or formatted incorrectly." } });
      }

      const errors: RowError[] = [];
      const validRows: Array<{ rowNum: number; data: z.infer<typeof attendanceUploadRowSchema> }> = [];

      for (let i = 0; i < rawData.length; i++) {
        const rowNum = i + 2;
        const parsed = attendanceUploadRowSchema.safeParse(rawData[i]);

        if (!parsed.success) {
          errors.push({
            row: rowNum,
            error: `Missing required column: ${parsed.error.issues[0]?.path.join(".") ?? "unknown"}`,
          });
          continue;
        }
        validRows.push({ rowNum, data: parsed.data });
      }

      if (validRows.length === 0) {
        return res.status(400).json({ error: { message: "No valid rows found in the sheet", details: errors } });
      }

      const uploadRows: Array<{
        employeeCode: string;
        inTime: string | null;
        outTime: string | null;
        totalHours: string | null;
        attendanceDate: string;
      }> = [];

      for (const { rowNum, data } of validRows) {
        let dateObj: Date;
        try {
          dateObj = parseExcelDate(data.Date);
          if (isNaN(dateObj.getTime())) throw new Error();
        } catch {
          errors.push({ row: rowNum, error: "Invalid date format" });
          continue;
        }

        const attendanceDate = formatDateYmd(dateObj);
        const inTime = parseTime(data["In Time"]);
        const outTime = parseTime(data["Out Time"]);
        const totalHours = parseTime(data["Wrk Hrs"]);

        uploadRows.push({
          employeeCode: String(data["EMP Code"] ?? "").trim(),
          inTime,
          outTime,
          totalHours,
          attendanceDate,
        });
      }

      let attendanceId: number | undefined;

      if (uploadRows.length > 0) {
        await db.transaction(async (tx) => {
          const [batch] = await tx
            .insert(attendance)
            .values({
              fileName: req.file!.originalname,
              totalRecords: uploadRows.length,
            })
            .returning({ id: attendance.id });

          attendanceId = batch.id;

          for (const row of uploadRows) {
            await tx
              .insert(attendanceUploads)
              .values({
                attendanceId: batch.id,
                employeeCode: row.employeeCode,
                inTime: row.inTime,
                outTime: row.outTime,
                totalHours: row.totalHours,
                attendanceDate: row.attendanceDate,
              })
              .onConflictDoUpdate({
                target: [
                  attendanceUploads.employeeCode,
                  attendanceUploads.attendanceDate,
                ],
                set: {
                  attendanceId: batch.id,
                  inTime: row.inTime,
                  outTime: row.outTime,
                  totalHours: row.totalHours,
                  createdAt: new Date(),
                },
              });
          }
        });
      }

      res.json({
        success: true,
        message: "Attendance upload processed",
        attendanceId,
        uploaded: uploadRows.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err: unknown) {
      next(err);
    }
  },
);
