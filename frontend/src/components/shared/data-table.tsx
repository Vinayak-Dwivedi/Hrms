/** biome-ignore-all lint/style/noNonNullAssertion: <"explanation"> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <"explanation"> */
/** biome-ignore-all lint/complexity/noImplicitCoercions: <its fine for this> */
"use client";

import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Loader2,
  SearchIcon,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ---- Sortable column header ---------------------------------------------

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
};

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <span className={cn("text-sm font-medium", className)}>{title}</span>
    );
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      className={cn("-ml-2 h-8 gap-1.5", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}
      size="sm"
      type="button"
      variant="ghost"
    >
      <span>{title}</span>
      {sorted === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : sorted === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-50" />
      )}
    </Button>
  );
}

// ---- DataTable -----------------------------------------------------------

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // Server-side state & callbacks
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: React.Dispatch<React.SetStateAction<PaginationState>>;
  sorting?: SortingState;
  onSortingChange?: React.Dispatch<React.SetStateAction<SortingState>>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: React.Dispatch<
    React.SetStateAction<ColumnFiltersState>
  >;

  // Client-side controlled state (optional)
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: React.Dispatch<
    React.SetStateAction<VisibilityState>
  >;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: React.Dispatch<
    React.SetStateAction<RowSelectionState>
  >;

  // Initial uncontrolled state
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  getRowId?: (row: TData, index: number, parent?: Row<TData>) => string;

  // Loading / fetching
  isLoading?: boolean;
  isFetching?: boolean;
  loadingRowCount?: number;

  // Filter input — `filterColumnId`/`filterColumnName` and
  // `searchableColumn`/`searchPlaceholder` are interchangeable aliases.
  filterColumnId?: string;
  filterColumnName?: string;
  searchableColumn?: string;
  searchPlaceholder?: string;

  // Empty state
  emptyMessage?: React.ReactNode;

  // Toolbar slot — rendered on the right, before the Columns dropdown
  toolbarActions?: React.ReactNode;

  // Expansion
  getRowCanExpand?: (row: Row<TData>) => boolean;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;

  // Hide controls (handy for sub-tables)
  hidePagination?: boolean;
  hideColumnVisibility?: boolean;
  hideFilterInput?: boolean;

  className?: string;
};

type DataTableRowWithSubRows<TData> = TData & {
  subRows?: TData[];
};

export function DataTable<TData, TValue>({
  columns,
  data,

  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  pageCount: controlledPageCount,
  pagination: controlledPagination,
  onPaginationChange,
  sorting: controlledSorting,
  onSortingChange,
  columnFilters: controlledColumnFilters,
  onColumnFiltersChange,

  columnVisibility: controlledColumnVisibility,
  onColumnVisibilityChange,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,

  initialSorting,
  initialColumnVisibility,
  getRowId,

  isLoading = false,
  isFetching = false,
  loadingRowCount = 5,

  filterColumnId,
  filterColumnName,
  searchableColumn,
  searchPlaceholder,

  emptyMessage = "No results.",
  toolbarActions,

  getRowCanExpand,
  renderSubComponent,

  hidePagination = false,
  hideColumnVisibility = false,
  hideFilterInput = false,

  className,
}: DataTableProps<TData, TValue>) {
  const resolvedFilterColumnId = filterColumnId ?? searchableColumn;

  // --- Internal state (used when caller doesn't control it) ---
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(
    initialSorting ?? [],
  );
  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility ?? {});
  const [internalRowSelection, setInternalRowSelection] = React.useState({});
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const isServerPaginated =
    manualPagination &&
    !!onPaginationChange &&
    controlledPagination !== undefined;
  const isServerSorted =
    manualSorting && !!onSortingChange && controlledSorting !== undefined;
  const isServerFiltered =
    manualFiltering &&
    !!onColumnFiltersChange &&
    controlledColumnFilters !== undefined;

  const pagination = isServerPaginated
    ? controlledPagination
    : internalPagination;
  const sorting = isServerSorted ? controlledSorting : internalSorting;
  const columnFilters = isServerFiltered
    ? controlledColumnFilters
    : internalColumnFilters;
  const columnVisibility =
    controlledColumnVisibility ?? internalColumnVisibility;
  const rowSelection = controlledRowSelection ?? internalRowSelection;

  const setPagination = isServerPaginated
    ? onPaginationChange
    : setInternalPagination;
  const setSorting = isServerSorted ? onSortingChange : setInternalSorting;
  const setColumnFilters = isServerFiltered
    ? onColumnFiltersChange
    : setInternalColumnFilters;
  const setColumnVisibility =
    onColumnVisibilityChange ?? setInternalColumnVisibility;
  const setRowSelection = onRowSelectionChange ?? setInternalRowSelection;

  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: isServerPaginated,
    manualSorting: isServerSorted,
    manualFiltering: isServerFiltered,
    pageCount: isServerPaginated ? controlledPageCount : undefined,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getSubRows: (row) => (row as DataTableRowWithSubRows<TData>).subRows,
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand,
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
    },
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // --- Debounced filter input ---
  const filterInputTarget = resolvedFilterColumnId
    ? table.getColumn(resolvedFilterColumnId)
    : undefined;
  const [filterInputValue, setFilterInputValue] = React.useState(
    (columnFilters.find((f) => f.id === resolvedFilterColumnId)
      ?.value as string) ?? "",
  );

  React.useEffect(() => {
    setFilterInputValue(
      (columnFilters.find((f) => f.id === resolvedFilterColumnId)
        ?.value as string) ?? "",
    );
  }, [columnFilters, resolvedFilterColumnId]);

  React.useEffect(() => {
    if (!resolvedFilterColumnId) return;
    const timeout = setTimeout(() => {
      setColumnFilters((prev) => {
        const existing = prev.find((f) => f.id === resolvedFilterColumnId);
        if (!filterInputValue) {
          return prev.filter((f) => f.id !== resolvedFilterColumnId);
        }
        if (existing) {
          return prev.map((f) =>
            f.id === resolvedFilterColumnId
              ? { ...f, value: filterInputValue }
              : f,
          );
        }
        return [
          ...prev,
          { id: resolvedFilterColumnId, value: filterInputValue },
        ];
      });
      if (!isServerPaginated) {
        table.setPageIndex(0);
      } else if (onPaginationChange) {
        onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }));
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [
    filterInputValue,
    resolvedFilterColumnId,
    setColumnFilters,
    isServerPaginated,
    onPaginationChange,
    table,
  ]);

  // --- Derived view state ---
  const placeholder =
    searchPlaceholder ?? `Filter by ${filterColumnName ?? "items"}...`;

  const hideableColumns = table.getAllColumns().filter((c) => c.getCanHide());
  const showColumnVisibility =
    !hideColumnVisibility && hideableColumns.length > 0;
  const showFilterInput =
    !hideFilterInput && !!resolvedFilterColumnId && !!filterInputTarget;
  const showToolbar =
    showFilterInput || showColumnVisibility || !!toolbarActions;

  const visibleColumnCount =
    table.getVisibleLeafColumns().length || columns.length;
  const rows = table.getRowModel().rows;

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {showFilterInput && (
            <InputGroup className="w-full sm:max-w-xs">
              <InputGroupInput
                onChange={(e) => setFilterInputValue(e.target.value)}
                placeholder={placeholder}
                value={filterInputValue}
              />
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
            </InputGroup>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {toolbarActions}
            {showColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline">
                    Columns
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hideableColumns.map((column) => {
                    const label =
                      (column.columnDef.meta as { label?: string } | undefined)
                        ?.label ?? column.id.replace(/_/g, " ");
                    return (
                      <DropdownMenuCheckboxItem
                        checked={column.getIsVisible()}
                        className="capitalize"
                        key={column.id}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="relative overflow-hidden rounded-md border">
        {isFetching && !isLoading && (
          <div className="pointer-events-none absolute top-1.5 right-1.5 z-10 rounded-md bg-background/80 p-1 backdrop-blur-sm">
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: loadingRowCount }).map((_, i) => (
                <TableRow key={`skeleton-row-${i}`}>
                  {Array.from({ length: visibleColumnCount }).map((__, j) => (
                    <TableCell key={`skeleton-cell-${i}-${j}`}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && renderSubComponent && (
                    <TableRow>
                      <TableCell
                        className="p-0"
                        colSpan={row.getVisibleCells().length}
                      >
                        {renderSubComponent({ row })}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  className="h-16 text-center text-muted-foreground text-sm"
                  colSpan={visibleColumnCount}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!hidePagination && (
        <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Rows per page</span>
            <Select
              onValueChange={(value) => table.setPageSize(Number(value))}
              value={`${table.getState().pagination.pageSize}`}
            >
              <SelectTrigger className="w-[68px]" size="sm">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 15, 20, 25, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={!table.getCanPreviousPage() || isLoading}
              onClick={() => table.previousPage()}
              size="sm"
              type="button"
              variant="outline"
            >
              Previous
            </Button>
            <Button
              disabled={!table.getCanNextPage() || isLoading}
              onClick={() => table.nextPage()}
              size="sm"
              type="button"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
