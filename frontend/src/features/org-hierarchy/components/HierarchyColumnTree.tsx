"use client";

import { useEffect, useRef } from "react";
import HierarchyNodeCard, {
  type HierarchyNodeKind,
} from "@/features/org-hierarchy/components/HierarchyNodeCard";
import { employeeCardClass } from "@/features/employees/employee-theme";
import { cn } from "@/lib/utils";

export type HierarchyColumnNode = {
  id: string;
  kind: HierarchyNodeKind;
  title: string;
  subtitle?: string | null;
  count?: number;
  selected?: boolean;
  highlighted?: boolean;
  empId?: string;
  profilePhotoUrl?: string | null;
  employeeId?: number;
  onClick: () => void;
};

export type HierarchyColumn = {
  id: string;
  title?: string;
  nodes: HierarchyColumnNode[];
  emptyMessage?: string;
};

type Props = {
  columns: HierarchyColumn[];
  scrollToNodeId?: string | null;
};

export default function HierarchyColumnTree({
  columns,
  scrollToNodeId,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!scrollToNodeId) return;
    const el = nodeRefs.current.get(scrollToNodeId);
    if (!el) return;
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [scrollToNodeId, columns]);

  if (columns.length === 0) {
    return (
      <div className={`${employeeCardClass} p-6 text-center text-[13px] text-gray-500`}>
        No hierarchy data to display.
      </div>
    );
  }

  return (
    <div className={`${employeeCardClass} overflow-hidden`}>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto overscroll-x-contain"
      >
        {columns.map((column, columnIndex) => (
          <div key={column.id} className="flex shrink-0">
            <div className="flex w-[min(280px,85vw)] shrink-0 flex-col">
              {column.title ? (
                <div className="border-b border-gray-100 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {column.title}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-1 flex-col gap-1.5 p-2 min-h-[200px] max-h-[min(70vh,640px)] overflow-y-auto">
                {column.nodes.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[12px] text-gray-400">
                    {column.emptyMessage ?? "Nothing to show"}
                  </p>
                ) : (
                  column.nodes.map((node) => (
                    <div
                      key={node.id}
                      ref={(el) => {
                        if (el) nodeRefs.current.set(node.id, el);
                        else nodeRefs.current.delete(node.id);
                      }}
                      data-node-id={node.id}
                    >
                      <HierarchyNodeCard
                        kind={node.kind}
                        title={node.title}
                        subtitle={node.subtitle}
                        count={node.count}
                        selected={node.selected}
                        highlighted={node.highlighted}
                        empId={node.empId}
                        profilePhotoUrl={node.profilePhotoUrl}
                        employeeId={node.employeeId}
                        onClick={node.onClick}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {columnIndex < columns.length - 1 ? (
              <div
                aria-hidden
                className="relative w-8 shrink-0 self-stretch"
              >
                <div
                  className={cn(
                    "absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-gray-200",
                  )}
                />
                {column.nodes.some((n) => n.selected) ? (
                  <div className="absolute left-1/2 top-[calc(50%-0.5px)] h-px w-full -translate-y-1/2 bg-gray-200" />
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
