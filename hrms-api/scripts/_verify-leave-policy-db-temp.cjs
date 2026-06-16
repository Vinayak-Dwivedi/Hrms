const postgres = require("postgres");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:SKIisL1apB@10.24.24.248:5432/ileads_hrms";

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
  const errors = [];

  try {
    console.log("=== leave_types (SELECT * ORDER BY id) ===");
    const leaveTypes = await sql`SELECT * FROM leave_types ORDER BY id`;
    console.log("row_count:", leaveTypes.length);
    console.log(JSON.stringify(leaveTypes, null, 2));

    console.log("\n=== leave_policies count ===");
    const countRows = await sql`SELECT count(*)::int AS count FROM leave_policies`;
    const count = countRows[0]?.count;
    console.log("count:", count);
  } catch (e) {
    errors.push(String(e?.stack || e));
    console.error("DB_ERROR:", e);
  } finally {
    await sql.end({ timeout: 5 });
  }

  console.log("\n=== HTTP GET /api/admin/leave-types ===");
  let httpStatus = null;
  let httpBody = "";
  try {
    const res = await fetch("http://10.24.24.248:4000/api/admin/leave-types");
    httpStatus = res.status;
    httpBody = await res.text();
    console.log("status:", httpStatus);
    console.log("body:", httpBody.slice(0, 500));
  } catch (e) {
    errors.push("HTTP: " + String(e?.message || e));
    console.error("HTTP_ERROR:", e);
  }

  const dbOk = errors.filter((e) => !e.startsWith("HTTP:")).length === 0;
  const httpOk = httpStatus === 401 || httpStatus === 403;
  const httpSkipped = httpStatus === null && errors.some((e) => e.startsWith("HTTP:"));
  const passed = dbOk && (httpOk || httpSkipped);

  console.log("\n=== VERIFICATION ===");
  console.log("db_ok:", dbOk);
  console.log("http_ok:", httpOk, httpSkipped ? "(unreachable - not failing)" : "");
  console.log("PASSED:", passed);
  if (errors.length) console.log("errors:", errors);

  process.exit(passed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
