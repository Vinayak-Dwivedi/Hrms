"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  archiveShiftConfig,
  listShiftConfigs,
  updateShiftConfig,
  type ShiftSummary,
} from "@/features/shift-configuration/api/shift-configs.client";
import { formatShiftTiming } from "@/features/shift-configuration/lib/shift-scope";
import ShiftDialog from "@/features/shift-configuration/ShiftDialog";
import {
  employeeCardClass,
  employeeErrorBannerClass,
  employeeFormSectionClass,
  employeeListFormSectionHeaderClass,
  employeeListFormSectionIconClass,
  employeeListFormSectionIconWrapClass,
  employeeListFormSectionTitleClass,
  employeeListTableCellClass,
  employeeListTableEmptyClass,
  employeeListTableHeadClass,
  employeeListTableRowClass,
} from "@/features/employees/employee-theme";

type DialogTarget = ShiftSummary | "new" | null;

export default function ShiftConfigurationPage() {
  const [items, setItems] = useState<ShiftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogTarget>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listShiftConfigs();
      setItems(list.filter((c) => c.status !== "Archived"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function togglePublish(item: ShiftSummary) {
    const next = item.status === "Published" ? "Draft" : "Published";
    try {
      await updateShiftConfig(item.id, { status: next });
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleArchive(item: ShiftSummary) {
    if (!confirm(`Archive "${item.name}"?`)) return;
    try {
      await archiveShiftConfig(item.id);
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-6 pb-8">
      <section className={employeeFormSectionClass}>
        <div className={employeeListFormSectionHeaderClass}>
          <div className="flex items-center gap-2.5">
            <div className={employeeListFormSectionIconWrapClass}>
              <Clock className={employeeListFormSectionIconClass} />
            </div>
            <h2 className={employeeListFormSectionTitleClass}>Shift Configuration</h2>
          </div>
        </div>

        <div className={`${employeeCardClass} border-0 shadow-none rounded-none`}>
          <div className="px-4 py-3 flex justify-end border-b border-slate-100">
            <button
              type="button"
              onClick={() => setDialog("new")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
            >
              <Plus size={14} />
              Add Shift
            </button>
          </div>

          {error && <div className={`mx-4 mt-4 ${employeeErrorBannerClass}`}>{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Name", "Timing", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`${employeeListTableHeadClass} ${
                        h === "Actions" ? "text-right pr-4" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className={employeeListTableEmptyClass}>
                      <Loader2 className="inline animate-spin mr-2" size={16} />
                      Loading shifts…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className={employeeListTableEmptyClass}>
                      No shifts configured yet. Click &quot;Add Shift&quot;.
                    </td>
                  </tr>
                )}
                {rows.map((item) => (
                  <tr key={item.id} className={employeeListTableRowClass}>
                    <td className={`${employeeListTableCellClass} font-medium text-slate-800`}>
                      <button
                        type="button"
                        onClick={() => setDialog(item)}
                        className="text-left hover:underline"
                      >
                        {item.name}
                      </button>
                    </td>
                    <td className={employeeListTableCellClass}>
                      {formatShiftTiming(item.startTimeDisplay, item.endTimeDisplay)}
                    </td>
                    <td className={employeeListTableCellClass}>
                      <span className="inline-block text-[10.5px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {item.status}
                      </span>
                    </td>
                    <td className={`${employeeListTableCellClass} text-right pr-4`}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setDialog(item)}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title={item.status === "Published" ? "Unpublish" : "Publish"}
                          onClick={() => togglePublish(item)}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                        >
                          {item.status === "Published" ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Archive"
                          onClick={() => handleArchive(item)}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {dialog && (
        <ShiftDialog
          target={dialog}
          onClose={() => setDialog(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
