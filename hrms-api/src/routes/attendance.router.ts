import { Router } from "express";
import multer from "multer";
import * as xlsx from "xlsx";
import { z } from "zod";
import { db } from "@/db/runtime";
import { attendanceRecords, employees } from "@/db/schema/hrms";
import { inArray } from "drizzle-orm";

export const attendanceRouter: Router = Router();

// [AI_PROD_NOTE]: For Excel bulk uploads, memoryStorage is perfect even in production (AWS EC2). 
// The file is small, kept in RAM, parsed, and immediately garbage collected. 
// Do NOT use multer-s3 for this specific route because we only need the *data* inside the file, not the file itself.
// (However, for employee profile pictures or permanent PDF documents, you should switch those specific routes to multer-s3).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Zod schema based on the biometric export headers (e.g. mPocket sheets).
// Time columns may arrive as text ("8:02") or as Excel serial datetimes (a
// number whose fractional part is the time of day), so we accept both.
const uploadRowSchema = z.object({
  "Location": z.union([z.string(), z.number()]).optional(),
  "Date": z.union([z.string(), z.number()]),
  "EMP Code": z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  "Emp Name": z.union([z.string(), z.number()]).optional(),
  "In Time": z.union([z.string(), z.number()]).optional(),
  "Out Time": z.union([z.string(), z.number()]).optional(),
  "Work Hrs": z.union([z.string(), z.number()]).optional(),
});

// Convert a time cell into "HH:mm:ss". Accepts either a "H:mm" text value or
// an Excel serial datetime number (the fractional part encodes the time).
function parseTime(timeVal: string | number | undefined): string | null {
  if (timeVal === undefined || timeVal === null || timeVal === "") return null;
  if (typeof timeVal === "number") {
    const frac = timeVal - Math.floor(timeVal);
    const totalSeconds = Math.round(frac * 86400);
    const hh = Math.floor(totalSeconds / 3600) % 24;
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  const parts = String(timeVal).trim().split(":");
  if (parts.length >= 2) {
    const hh = (parts[0] ?? "").padStart(2, "0");
    const mm = (parts[1] ?? "").padStart(2, "0");
    return `${hh}:${mm}:00`;
  }
  return null;
}

// Helper to convert "Worked Hours" (e.g. "9:25") into integer minutes
function parseWorkingMinutes(workedHoursStr: string | number | undefined): number {
  if (workedHoursStr === undefined || workedHoursStr === null || workedHoursStr === "") return 0;
  const parts = String(workedHoursStr).trim().split(":");
  if (parts.length >= 2) {
    const hours = parseInt(parts[0] ?? "", 10) || 0;
    const mins = parseInt(parts[1] ?? "", 10) || 0;
    return hours * 60 + mins;
  }
  return 0;
}

// Helper to handle Excel's internal date formats (serial number vs string)
function parseExcelDate(dateVal: string | number): Date {
  if (typeof dateVal === "number") {
    // Excel stores dates as days since Jan 1, 1900
    // 25567 is the offset for 1970-01-01 (Unix Epoch), minus 2 for Excel leap year bug
    return new Date((dateVal - 25569) * 86400 * 1000);
  }
  return new Date(dateVal);
}

attendanceRouter.post("/upload-bulk", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: "No file uploaded" } });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet) {
      return res.status(400).json({ error: { message: "Excel file has no readable sheet." } });
    }
    // Convert the first sheet to an array of objects based on header row
    const rawData = xlsx.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
      return res.status(400).json({ error: { message: "Excel file is empty or formatted incorrectly." } });
    }

    const errors: Array<{ row: number; error: string }> = [];
    const validRows: any[] = [];
    const employeeCodes = new Set<string>();
    const empNames = new Map<string, string>(); // EMP Code -> Emp Name (for auto-creating stubs)

    // 1. Structure Validation
    for (let i = 0; i < rawData.length; i++) {
      const rowNum = i + 2; // +1 for 0-index array, +1 because row 1 is headers in Excel
      const row = rawData[i];
      const parsed = uploadRowSchema.safeParse(row);
      
      if (!parsed.success) {
        errors.push({ row: rowNum, error: `Missing required column: ${parsed.error.issues[0]?.path.join(".") ?? "unknown"}` });
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

    // 2. Fetch Employee internal IDs from the database using the "Employee Code" (empId)
    const empCodeArray = Array.from(employeeCodes);
    const matchedEmployees = await db
      .select({ id: employees.id, empId: employees.empId })
      .from(employees)
      .where(inArray(employees.empId, empCodeArray));

    // Map Employee Code (empId) -> Internal Database ID (id)
    const empMap = new Map<string, number>();
    for (const e of matchedEmployees) {
      empMap.set(e.empId, e.id);
    }

    // 2b. Auto-create stub employees for codes not yet in the DB. Biometric
    // exports reference staff before a full HR profile exists, so we insert a
    // minimal placeholder (neutral PII) that HR can complete later. Without
    // this, every attendance row for a new hire would be rejected.
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
          phone: "0000000000", // satisfies ^\+?[0-9]{7,15}$; placeholder
          dob: "1990-01-01", // placeholder, satisfies the 18-years check
          gender: "Other" as const,
          joiningDate: "2020-01-01", // placeholder
          passwordHash: "IMPORT_NO_LOGIN", // not a valid hash → login disabled
        };
      });
      const inserted = await db
        .insert(employees)
        .values(stubRows)
        .returning({ id: employees.id, empId: employees.empId });
      for (const e of inserted) empMap.set(e.empId, e.id);
      createdCount = inserted.length;
    }

    // 3. Prepare data for insertion
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
        dateObj = parseExcelDate(data["Date"]);
        if (isNaN(dateObj.getTime())) throw new Error();
      } catch {
        errors.push({ row: rowNum, error: `Invalid date format` });
        continue;
      }

      // Format to YYYY-MM-DD
      const dateStr = dateObj.toISOString().slice(0, 10);
      const punchIn = parseTime(data["In Time"]);
      const punchOut = parseTime(data["Out Time"]);
      const workingMinutes = parseWorkingMinutes(data["Work Hrs"]);
      
      // Determine Attendance Status
      let status: "Present" | "Absent" | "Half Day" | "Leave" | "Holiday" | "Weekend" = "Present";
      if (workingMinutes < 4 * 60) status = "Absent";
      else if (workingMinutes < 8 * 60) status = "Half Day";

      insertRecords.push({
        employeeId,
        date: dateStr,
        punchIn,
        punchOut,
        workingMinutes,
        status,
        location: data["Location"] ? String(data["Location"]) : null,
        isRegularised: false,
      });
    }

    // 4. Database Upsert (Insert or Update if exists)
    if (insertRecords.length > 0) {
      await db.transaction(async (tx) => {
        for (const record of insertRecords) {
          await tx.insert(attendanceRecords)
            .values(record)
            .onConflictDoUpdate({
              target: [attendanceRecords.employeeId, attendanceRecords.date], // Composite unique key
              set: {
                punchIn: record.punchIn,
                punchOut: record.punchOut,
                workingMinutes: record.workingMinutes,
                status: record.status,
                location: record.location,
                updatedAt: new Date(),
              }
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
  } catch (err: any) {
    next(err);
  }
});
