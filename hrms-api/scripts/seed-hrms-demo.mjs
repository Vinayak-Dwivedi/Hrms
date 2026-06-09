// Node-runnable HRMS demo seeder. Usage:
//   node src/scripts/seed-hrms-demo.mjs
// Reads DATABASE_URL from env (or .env.local / .env if not set).
// Safe to re-run (uses ON CONFLICT).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function loadDotEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let value = m[2];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* missing file is OK */
  }
}

loadDotEnv(resolve(process.cwd(), ".env.local"));
loadDotEnv(resolve(process.cwd(), ".env"));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { connect_timeout: 10, max: 1 });

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

try {
  console.log("Seeding HRMS demo data...");

  await sql`
    INSERT INTO branches (name, address, headcount)
    VALUES ('iLeads Dehradun HQ', 'Dehradun, UK', 8)
    ON CONFLICT (name) DO NOTHING
  `;
  const [branch] = await sql`SELECT id FROM branches WHERE name = 'iLeads Dehradun HQ'`;

  await sql`
    INSERT INTO departments (name, location_area, headcount)
    VALUES ('Operations', 'HQ-3F', 7)
    ON CONFLICT (name) DO NOTHING
  `;
  const [dept] = await sql`SELECT id FROM departments WHERE name = 'Operations'`;

  for (const [code, name] of [
    ["L1", "Junior IC"],
    ["L2", "Mid IC"],
    ["L3", "Senior IC"],
    ["M1", "Lead"],
    ["M2", "Manager"],
  ]) {
    await sql`
      INSERT INTO grades (code, band_name) VALUES (${code}, ${name})
      ON CONFLICT (code) DO NOTHING
    `;
  }
  const grades = await sql`SELECT id, code FROM grades`;
  const gradeByCode = Object.fromEntries(grades.map((g) => [g.code, g]));

  await sql`
    INSERT INTO employment_types (name, notice_period_days, active_employee_count)
    VALUES ('Full-Time', 60, 8)
    ON CONFLICT (name) DO NOTHING
  `;
  const [etype] = await sql`SELECT id FROM employment_types WHERE name = 'Full-Time'`;

  const desigDefs = [
    ["Senior Associate", "L2", "L2", "SRA"],
    ["Process Manager", "M1", "M2", "PM"],
    ["Associate", "L1", "L1", "ASC"],
    ["Senior Associate Plus", "L3", "L3", "SRAP"],
    ["Team Leader", "M1", "M1", "TL"],
    ["Quality Analyst", "L2", "L2", "QA"],
  ];
  for (const [name, gmin, gmax, code] of desigDefs) {
    await sql`
      INSERT INTO designations (name, code, department_id, grade_min_id, grade_max_id, employee_count)
      VALUES (${name}, ${code}, ${dept.id}, ${gradeByCode[gmin].id}, ${gradeByCode[gmax].id}, 1)
      ON CONFLICT (name) DO NOTHING
    `;
  }
  const desigs = await sql`SELECT id, name FROM designations`;
  const desigByName = Object.fromEntries(desigs.map((d) => [d.name, d]));

  // Leave types
  for (const [name, code] of [
    ["Annual Leave", "AL"],
    ["Sick Leave", "SL"],
    ["Casual Leave", "CL"],
    ["Compensatory Off", "CO"],
    ["Earned Leave", "EL"],
  ]) {
    await sql`
      INSERT INTO leave_types (name, code) VALUES (${name}, ${code})
      ON CONFLICT (code) DO NOTHING
    `;
  }
  const lts = await sql`SELECT id, code FROM leave_types`;
  const ltByCode = Object.fromEntries(lts.map((l) => [l.code, l]));

  // ─────────────────────────────────────────────────────────────────────────
  // Employees: Rahul (id≈1, employee), Priya (id≈2, manager), 5 team reports
  // ─────────────────────────────────────────────────────────────────────────
  const employeeDefs = [
    {
      empId: "ILD-2847",
      firstName: "Rahul",
      lastName: "Mehta",
      personalEmail: "rahul.mehta@example.com",
      workEmail: "rahul@ileads.com",
      phone: "9999900001",
      dob: "1995-04-12",
      gender: "Male",
      maritalStatus: "Single",
      designation: "Senior Associate",
      grade: "L2",
      joiningDate: "2022-01-15",
      role: "report",
    },
    {
      empId: "ILD-1042",
      firstName: "Priya",
      lastName: "Sharma",
      personalEmail: "priya.sharma@example.com",
      workEmail: "priya@ileads.com",
      phone: "9999900002",
      dob: "1988-09-21",
      gender: "Female",
      maritalStatus: "Married",
      spouseName: "Aman Sharma",
      designation: "Process Manager",
      grade: "M1",
      joiningDate: "2018-06-04",
      role: "manager",
    },
    {
      empId: "ILD-3001",
      firstName: "Aarav",
      lastName: "Singh",
      personalEmail: "aarav.singh@example.com",
      workEmail: "aarav@ileads.com",
      phone: "9999900003",
      dob: "1996-02-11",
      gender: "Male",
      maritalStatus: "Single",
      designation: "Associate",
      grade: "L1",
      joiningDate: "2023-02-01",
      role: "report",
    },
    {
      empId: "ILD-3002",
      firstName: "Kavya",
      lastName: "Bhatt",
      personalEmail: "kavya.bhatt@example.com",
      workEmail: "kavya@ileads.com",
      phone: "9999900004",
      dob: "1997-07-30",
      gender: "Female",
      maritalStatus: "Single",
      designation: "Associate",
      grade: "L1",
      joiningDate: "2023-03-15",
      role: "report",
    },
    {
      empId: "ILD-3003",
      firstName: "Rohan",
      lastName: "Thapa",
      personalEmail: "rohan.thapa@example.com",
      workEmail: "rohan@ileads.com",
      phone: "9999900005",
      dob: "1990-11-04",
      gender: "Male",
      maritalStatus: "Married",
      spouseName: "Nikita Thapa",
      designation: "Team Leader",
      grade: "M1",
      joiningDate: "2019-08-10",
      role: "report",
    },
    {
      empId: "ILD-3004",
      firstName: "Ishaan",
      lastName: "Pant",
      personalEmail: "ishaan.pant@example.com",
      workEmail: "ishaan@ileads.com",
      phone: "9999900006",
      dob: "1995-05-23",
      gender: "Male",
      maritalStatus: "Single",
      designation: "Associate",
      grade: "L1",
      joiningDate: "2022-10-12",
      role: "report",
    },
    {
      empId: "ILD-3005",
      firstName: "Vikram",
      lastName: "Negi",
      personalEmail: "vikram.negi@example.com",
      workEmail: "vikram@ileads.com",
      phone: "9999900007",
      dob: "1992-12-09",
      gender: "Male",
      maritalStatus: "Married",
      spouseName: "Sara Negi",
      designation: "Quality Analyst",
      grade: "L2",
      joiningDate: "2021-04-01",
      role: "report",
    },
    {
      empId: "ILD-4001",
      firstName: "Neha",
      lastName: "Kapoor",
      personalEmail: "neha.kapoor@example.com",
      workEmail: "neha@ileads.com",
      phone: "9999900008",
      dob: "1991-03-14",
      gender: "Female",
      maritalStatus: "Single",
      designation: "Senior Associate",
      grade: "L2",
      joiningDate: "2020-11-20",
      role: "report",
    },
  ];

  for (const e of employeeDefs) {
    await sql`
      INSERT INTO employees (
        emp_id, first_name, last_name, personal_email, work_email,
        phone, dob, gender, marital_status, spouse_name, nationality,
        branch_id, department_id, designation_id, grade_id, employment_type_id,
        joining_date, password_hash
      )
      VALUES (
        ${e.empId}, ${e.firstName}, ${e.lastName}, ${e.personalEmail}, ${e.workEmail},
        ${e.phone}, ${e.dob}, ${e.gender}, ${e.maritalStatus}, ${e.spouseName ?? null}, 'Indian',
        ${branch.id}, ${dept.id}, ${desigByName[e.designation].id}, ${gradeByCode[e.grade].id}, ${etype.id},
        ${e.joiningDate}, '$2a$10$placeholder'
      )
      ON CONFLICT (emp_id) DO NOTHING
    `;
  }
  const empRows = await sql`SELECT id, emp_id, first_name, last_name FROM employees ORDER BY id`;
  const empByEmpId = Object.fromEntries(empRows.map((e) => [e.emp_id, e]));
  const manager = empByEmpId["ILD-1042"];
  const rahul = empByEmpId["ILD-2847"];
  console.log(`employees: ${empRows.length} (manager=${manager.id}, employee=${rahul.id})`);

  // Wire reportingManager for all non-manager employees → Priya
  for (const e of empRows) {
    if (e.emp_id === manager.emp_id) continue;
    await sql`
      UPDATE employees
      SET reporting_manager_id = ${manager.id},
          reporting_chain = ARRAY[${manager.id}]::int[]
      WHERE id = ${e.id} AND reporting_manager_id IS DISTINCT FROM ${manager.id}
    `;
  }

  // Leave balances (everyone gets the same starter pack)
  for (const emp of empRows) {
    for (const [code, opening, used] of [
      ["AL", "18", emp.id === rahul.id ? "6" : "2"],
      ["SL", "8", "2"],
      ["CL", "6", "1"],
      ["CO", "4", "0"],
    ]) {
      const closing = String(Number(opening) - Number(used));
      await sql`
        INSERT INTO leave_balances (
          employee_id, leave_type_id, opening_balance, used, closing_balance
        )
        VALUES (${emp.id}, ${ltByCode[code].id}, ${opening}, ${used}, ${closing})
        ON CONFLICT (employee_id, leave_type_id) DO NOTHING
      `;
    }
  }

  // Attendance for this month: every employee, every weekday up to today
  const today = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let attCount = 0;
  for (const emp of empRows) {
    for (let t = monthStart.getTime(); t <= today.getTime(); t += dayMs) {
      const d = new Date(t);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      const isToday = ymd(d) === ymd(today);
      // Slight variation per employee
      const lateMin = (emp.id + d.getDate()) % 7;
      const punchInH = 9;
      const punchInM = lateMin;
      const punchIn = `${String(punchInH).padStart(2, "0")}:${String(punchInM).padStart(2, "0")}:00`;
      const punchOut = isToday ? null : "18:34:00";
      const working = isToday ? 220 + lateMin * 5 : 510 - lateMin;
      await sql`
        INSERT INTO attendance_records (
          employee_id, date, punch_in, punch_out, working_minutes,
          late_by_minutes, early_exit_minutes, status, location
        )
        VALUES (
          ${emp.id}, ${ymd(d)}, ${punchIn}, ${punchOut}, ${working},
          ${lateMin}, 0, 'Present', 'iLeads Dehradun HQ'
        )
        ON CONFLICT (employee_id, date) DO NOTHING
      `;
      attCount++;
    }
  }
  console.log(`seeded ${attCount} attendance rows`);

  // ── May 2026 historical attendance ────────────────────────────────────────
  // Rahul: 5 present (with punch times), 2 leave (19-20), rest absent
  // Other employees: mostly present with a few scattered absents
  const rahulMayPresent = {
    "2026-05-06": { punchIn: "09:02:00", punchOut: "18:35:00", working: 513, lateMin: 2 },
    "2026-05-09": { punchIn: "09:08:00", punchOut: "18:41:00", working: 513, lateMin: 8 },
    "2026-05-13": { punchIn: "09:00:00", punchOut: "18:30:00", working: 510, lateMin: 0 },
    "2026-05-22": { punchIn: "09:15:00", punchOut: "18:45:00", working: 510, lateMin: 15 },
    "2026-05-28": { punchIn: "09:04:00", punchOut: "18:38:00", working: 514, lateMin: 4 },
  };
  const rahulMayLeave = new Set(["2026-05-19", "2026-05-20"]);
  // Dates where non-Rahul employees are absent (by day-of-month)
  const otherAbsentDates = new Set([1, 7, 16, 23]);

  const may2026Start = new Date(2026, 4, 1);
  const may2026End = new Date(2026, 4, 31);
  let may2026Count = 0;

  for (let t = may2026Start.getTime(); t <= may2026End.getTime(); t += dayMs) {
    const d = new Date(t);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dateStr = ymd(d);

    for (const emp of empRows) {
      let status, punchIn, punchOut, working, lateMin;

      if (emp.id === rahul.id) {
        if (rahulMayPresent[dateStr]) {
          const p = rahulMayPresent[dateStr];
          status = "Present"; punchIn = p.punchIn; punchOut = p.punchOut;
          working = p.working; lateMin = p.lateMin;
        } else if (rahulMayLeave.has(dateStr)) {
          status = "Leave"; punchIn = null; punchOut = null; working = 0; lateMin = 0;
        } else {
          status = "Absent"; punchIn = null; punchOut = null; working = 0; lateMin = 0;
        }
      } else {
        lateMin = (emp.id + d.getDate()) % 7;
        if (otherAbsentDates.has(d.getDate())) {
          status = "Absent"; punchIn = null; punchOut = null; working = 0;
        } else {
          status = "Present";
          punchIn = `${String(9).padStart(2, "0")}:${String(lateMin).padStart(2, "0")}:00`;
          punchOut = "18:34:00";
          working = 510 - lateMin;
        }
      }

      await sql`
        INSERT INTO attendance_records (
          employee_id, date, punch_in, punch_out, working_minutes,
          late_by_minutes, early_exit_minutes, status, location
        )
        VALUES (
          ${emp.id}, ${dateStr}, ${punchIn}, ${punchOut}, ${working},
          ${lateMin}, 0, ${status}, 'iLeads Dehradun HQ'
        )
        ON CONFLICT (employee_id, date) DO NOTHING
      `;
      may2026Count++;
    }
  }
  console.log(`seeded ${may2026Count} May 2026 attendance rows`);

  // Rahul's own historical leave requests (employee view)
  const rahulLeaves = [
    {
      ltCode: "CL",
      fromOff: 7,
      toOff: 7,
      days: "0.5",
      durationType: "First Half",
      reason: "Personal errand",
      status: "Pending",
    },
    {
      ltCode: "SL",
      fromOff: 21,
      toOff: 19,
      days: "3",
      durationType: "Full Day",
      reason: "Flu and fever",
      status: "Approved",
    },
    {
      ltCode: "EL",
      fromOff: 35,
      toOff: 35,
      days: "1",
      durationType: "Full Day",
      reason: "Family function",
      status: "Cancelled",
    },
  ];
  for (const s of rahulLeaves) {
    const from = ymd(new Date(today.getTime() - s.fromOff * dayMs));
    const to = ymd(new Date(today.getTime() - s.toOff * dayMs));
    await sql`
      INSERT INTO leave_requests (
        employee_id, leave_type_id, from_date, to_date, days,
        duration_type, reason, status, manager_id
      )
      VALUES (
        ${rahul.id}, ${ltByCode[s.ltCode].id}, ${from}, ${to}, ${s.days},
        ${s.durationType}, ${s.reason}, ${s.status}, ${manager.id}
      )
    `;
  }

  // Pending leave requests from direct reports (for manager's approvals page)
  // Offsets are days from today; from must be <= to.
  const teamLeaves = [
    { empId: "ILD-3001", ltCode: "AL", days: "3", durationType: "Full Day", reason: "Family wedding", from: 3, to: 5 },
    { empId: "ILD-3002", ltCode: "SL", days: "2", durationType: "Full Day", reason: "Viral fever; certificate attached", from: 1, to: 2 },
    { empId: "ILD-3003", ltCode: "CL", days: "1", durationType: "Full Day", reason: "Personal work — bank documentation", from: 6, to: 6 },
    { empId: "ILD-3004", ltCode: "AL", days: "2", durationType: "Full Day", reason: "Family trip", from: 14, to: 15 },
    { empId: "ILD-3005", ltCode: "EL", days: "3", durationType: "Full Day", reason: "Going out of town", from: 8, to: 10 },
  ];
  for (const s of teamLeaves) {
    const emp = empByEmpId[s.empId];
    const from = ymd(new Date(today.getTime() + s.from * dayMs));
    const to = ymd(new Date(today.getTime() + s.to * dayMs));
    await sql`
      INSERT INTO leave_requests (
        employee_id, leave_type_id, from_date, to_date, days,
        duration_type, reason, status, manager_id
      )
      VALUES (
        ${emp.id}, ${ltByCode[s.ltCode].id}, ${from}, ${to}, ${s.days},
        ${s.durationType}, ${s.reason}, 'Pending', ${manager.id}
      )
    `;
  }

  // Regularisation requests (pending)
  const teamRegs = [
    {
      empId: "ILD-3005",
      offset: 5,
      originalIssue: "No punch recorded",
      requestedIn: "09:15:00",
      requestedOut: "18:30:00",
      reason: "Biometric not working, WFO confirmed by floor lead",
    },
    {
      empId: "ILD-3004",
      offset: 6,
      originalIssue: "Missing punch-out",
      requestedIn: "09:10:00",
      requestedOut: "18:42:00",
      reason: "Forgot to punch out due to client call running over",
    },
  ];
  for (const r of teamRegs) {
    const emp = empByEmpId[r.empId];
    const date = ymd(new Date(today.getTime() - r.offset * dayMs));
    await sql`
      INSERT INTO regularisation_requests (
        employee_id, date, original_issue, requested_punch_in,
        requested_punch_out, reason, status
      )
      VALUES (
        ${emp.id}, ${date}, ${r.originalIssue}, ${r.requestedIn},
        ${r.requestedOut}, ${r.reason}, 'Pending'
      )
    `;
  }

  console.log("done");
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
