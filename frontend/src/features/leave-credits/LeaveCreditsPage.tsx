"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, Loader2, Play, RotateCcw, ScrollText } from "lucide-react";
import {
  listAccrualPolicies,
  listCreditTransactions,
  runMonthlyAccrual,
  runYearlyGrant,
  type AccrualPolicySummary,
  type CreditRunSummary,
  type CreditTransactionRow,
} from "./api/leave-credits.client";

// Leave Credits admin page (M6).
//
// Layout matches Leave Policy / Holiday Calendars: white card with subtle
// gray border, brand pink accents, rounded-2xl.

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentYear(): number {
  return new Date().getFullYear();
}

export default function LeaveCreditsPage() {
  const [policies, setPolicies] = useState<AccrualPolicySummary[] | null>(null);
  const [policiesError, setPoliciesError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<CreditTransactionRow[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const [monthlyPeriod, setMonthlyPeriod] = useState(currentPeriod());
  const [yearlyYear, setYearlyYear] = useState(currentYear());
  const [forceMonth, setForceMonth] = useState(new Date().getMonth() + 1);

  const [running, setRunning] = useState<"monthly" | "yearly" | null>(null);
  const [lastRun, setLastRun] = useState<{
    kind: "monthly" | "yearly";
    summary: CreditRunSummary;
    dryRun: boolean;
  } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const refreshPolicies = useCallback(async () => {
    setPoliciesError(null);
    try {
      setPolicies(await listAccrualPolicies());
    } catch (e) {
      setPoliciesError((e as Error).message);
    }
  }, []);

  const refreshTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    try {
      setTransactions(await listCreditTransactions({ limit: 50 }));
    } catch (e) {
      setTransactionsError((e as Error).message);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPolicies();
    refreshTransactions();
  }, [refreshPolicies, refreshTransactions]);

  async function trigger(kind: "monthly" | "yearly", dryRun: boolean) {
    setRunning(kind);
    setRunError(null);
    setLastRun(null);
    try {
      const result =
        kind === "monthly"
          ? await runMonthlyAccrual({ period: monthlyPeriod, dryRun })
          : await runYearlyGrant({
              year: yearlyYear,
              forceMonth,
              dryRun,
            });
      setLastRun({ kind, ...result });
      if (!dryRun) {
        await refreshTransactions();
      }
    } catch (e) {
      setRunError((e as Error).message);
    } finally {
      setRunning(null);
    }
  }

  const monthlyPolicies = policies?.filter(
    (p) => p.config.frequency === "Monthly",
  );
  const yearlyPolicies = policies?.filter(
    (p) => p.config.frequency === "Yearly",
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
          Leave Credits
        </h1>
      </div>

      {/* ── Run cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Accrual */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
          <header className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#FF014F] flex items-center justify-center">
              <Coins size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                Monthly Accrual
              </h3>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Drips per-month credits (e.g. CL = 1, SL = 0.5) into eligible
                balances.
              </p>
            </div>
          </header>

          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-gray-700">
                Period (YYYY-MM)
              </label>
              <input
                value={monthlyPeriod}
                onChange={(e) => setMonthlyPeriod(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
                placeholder="2026-06"
              />
            </div>
            <button
              type="button"
              onClick={() => setMonthlyPeriod(currentPeriod())}
              className="px-3 py-2 rounded-lg text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
            >
              Today
            </button>
          </div>

          <PolicyPreview
            scope="Monthly"
            policies={monthlyPolicies}
            error={policiesError}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => trigger("monthly", true)}
              disabled={running !== null}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[12.5px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              {running === "monthly" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              Dry Run
            </button>
            <button
              type="button"
              onClick={() => trigger("monthly", false)}
              disabled={running !== null}
              className="flex-[2] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50"
            >
              {running === "monthly" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
              Run Accrual
            </button>
          </div>
        </section>

        {/* Yearly Grant */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
          <header className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#FF014F] flex items-center justify-center">
              <Coins size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                Yearly Grant
              </h3>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Lumps annual entitlement (e.g. EL = 15) into balances on the
                configured grant month.
              </p>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-gray-700">
                Year
              </label>
              <input
                type="number"
                min={2020}
                max={2100}
                value={yearlyYear}
                onChange={(e) =>
                  setYearlyYear(Math.max(2020, Number(e.target.value) || 2020))
                }
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-gray-700">
                Grant Month
              </label>
              <select
                value={forceMonth}
                onChange={(e) => setForceMonth(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fda4af] focus:border-[#fda4af]"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <PolicyPreview
            scope="Yearly"
            policies={yearlyPolicies?.filter(
              (p) => (p.config.yearlyGrantMonth ?? 1) === forceMonth,
            )}
            error={policiesError}
            footnote={`Only policies whose grant month equals ${MONTHS[forceMonth - 1]} will fire.`}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => trigger("yearly", true)}
              disabled={running !== null}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[12.5px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              {running === "yearly" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              Dry Run
            </button>
            <button
              type="button"
              onClick={() => trigger("yearly", false)}
              disabled={running !== null}
              className="flex-[2] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow disabled:opacity-50"
            >
              {running === "yearly" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
              Run Grant
            </button>
          </div>
        </section>
      </div>

      {/* ── Result / errors ───────────────────────────────────────────── */}
      {runError && (
        <div className="text-[12.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
          {runError}
        </div>
      )}

      {lastRun && (
        <div
          className={[
            "border rounded-2xl px-5 py-4",
            lastRun.dryRun
              ? "bg-amber-50 border-amber-200"
              : "bg-emerald-50 border-emerald-200",
          ].join(" ")}
        >
          <p className="text-[13px] font-semibold text-gray-900">
            {lastRun.dryRun ? "Dry run" : "Run"} —{" "}
            {lastRun.kind === "monthly" ? "Monthly Accrual" : "Yearly Grant"}
          </p>
          <div className="grid grid-cols-4 gap-4 mt-3">
            <Stat label="Attempted" value={lastRun.summary.attempted} />
            <Stat label="Applied" value={lastRun.summary.applied} accent />
            <Stat label="Skipped" value={lastRun.summary.skipped} />
            <Stat
              label="Errors"
              value={lastRun.summary.errors}
              accent={lastRun.summary.errors > 0 ? "rose" : undefined}
            />
          </div>
          {lastRun.summary.errorSamples.length > 0 && (
            <details className="mt-3 text-[12px]">
              <summary className="cursor-pointer text-rose-700 font-semibold">
                {lastRun.summary.errorSamples.length} error sample
                {lastRun.summary.errorSamples.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-2 list-disc pl-5 text-gray-700">
                {lastRun.summary.errorSamples.map((s, i) => (
                  <li key={i}>
                    emp #{s.employeeId} · type #{s.leaveTypeId}: {s.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* ── Transactions table ────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ScrollText size={16} className="text-gray-400" />
            <div>
              <h3 className="text-[14px] font-bold text-gray-900 leading-tight">
                Recent Transactions
              </h3>
              <p className="text-[11.5px] text-gray-500">
                Last 50 credits across all employees
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshTransactions}
            disabled={transactionsLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw
              size={12}
              className={transactionsLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {transactionsLoading && transactions.length === 0 && (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 size={18} className="animate-spin mr-2" />
            <span className="text-[12px]">Loading…</span>
          </div>
        )}

        {transactionsError && (
          <div className="px-5 py-3 text-[12px] text-rose-700 bg-rose-50 border-t border-rose-200">
            {transactionsError}
          </div>
        )}

        {!transactionsLoading && transactions.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-[12.5px]">
            No transactions yet. Run an accrual or grant.
          </div>
        )}

        {transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <Th>Period</Th>
                  <Th>Employee</Th>
                  <Th>Leave Type</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Kind</Th>
                  <Th>Reason</Th>
                  <Th>When</Th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-gray-100 hover:bg-gray-50/50"
                  >
                    <Td className="font-mono text-[11.5px]">{t.period}</Td>
                    <Td>{t.employeeName ?? `#${t.employeeId}`}</Td>
                    <Td>
                      <span className="text-gray-900">
                        {t.leaveTypeName}
                      </span>
                      <span className="text-gray-400 ml-1">
                        ({t.leaveTypeCode})
                      </span>
                    </Td>
                    <Td className="text-right font-semibold">
                      +{t.amount.toFixed(2)}
                    </Td>
                    <Td>
                      <KindBadge kind={t.kind} />
                    </Td>
                    <Td className="text-gray-500">{t.reason}</Td>
                    <Td className="text-gray-400 text-[11px]">
                      {new Date(t.createdAt).toLocaleString()}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── helpers / small components ────────────────────────────────────────────

function PolicyPreview({
  scope,
  policies,
  error,
  footnote,
}: {
  scope: "Monthly" | "Yearly";
  policies: AccrualPolicySummary[] | undefined;
  error: string | null;
  footnote?: string;
}) {
  if (error) {
    return (
      <p className="text-[11.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
        {error}
      </p>
    );
  }
  if (!policies) {
    return (
      <p className="text-[11.5px] text-gray-400 italic">
        Loading policies…
      </p>
    );
  }
  if (policies.length === 0) {
    return (
      <div className="text-[11.5px] text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded px-3 py-3">
        <p>No {scope.toLowerCase()} accrual policies configured.</p>
        <p className="text-gray-400 mt-1">
          Add{" "}
          <code className="bg-gray-100 px-1 rounded text-[10.5px]">
            settings.accrual = {"{ frequency: '"}
            {scope}
            {"', "}
            {scope === "Monthly" ? "monthlyAmount" : "yearlyAmount"}
            {": <n> }"}
          </code>{" "}
          on a Leave Policy and it will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="text-[12px]">
      <p className="text-[10.5px] font-bold tracking-widest text-gray-400 uppercase mb-2">
        Will Fire ({policies.length})
      </p>
      <ul className="flex flex-col gap-1.5">
        {policies.map((p) => (
          <li
            key={`${p.policyId}-${p.leaveTypeId}`}
            className="flex items-center justify-between bg-gray-50 rounded px-2.5 py-1.5"
          >
            <span className="text-gray-800 truncate">
              {p.policyName} · {p.leaveTypeName}{" "}
              <span className="text-gray-400">({p.leaveTypeCode})</span>
            </span>
            <span className="font-semibold text-[#FF014F] shrink-0">
              +
              {scope === "Monthly"
                ? p.config.monthlyAmount
                : p.config.yearlyAmount}
            </span>
          </li>
        ))}
      </ul>
      {footnote && (
        <p className="text-[10.5px] text-gray-400 mt-2 italic">{footnote}</p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: true | "rose";
}) {
  let cls = "text-gray-900";
  if (accent === true) cls = "text-[#FF014F]";
  if (accent === "rose") cls = "text-rose-700";
  return (
    <div>
      <p className="text-[10.5px] font-bold tracking-widest text-gray-500 uppercase">
        {label}
      </p>
      <p className={`text-[20px] font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    Accrual: "bg-blue-50 text-blue-700 border-blue-200",
    Grant: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Adjustment: "bg-amber-50 text-amber-700 border-amber-200",
    CarryForward: "bg-violet-50 text-violet-700 border-violet-200",
    Lapse: "bg-rose-50 text-rose-700 border-rose-200",
    Encashment: "bg-pink-50 text-pink-700 border-pink-200",
  };
  return (
    <span
      className={[
        "inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border",
        map[kind] ?? "bg-gray-100 text-gray-600 border-gray-200",
      ].join(" ")}
    >
      {kind}
    </span>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={[
        "text-[10.5px] font-bold tracking-widest uppercase px-3 py-2 text-left",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={["px-3 py-2 align-middle", className ?? ""].join(" ")}>
      {children}
    </td>
  );
}
