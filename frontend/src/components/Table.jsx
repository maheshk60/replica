import React, { useState, useMemo, useEffect } from "react";
import "./Table.css";

/**
 * Shared Table used by every feature in the app.
 *
 * Basic usage (no sorting/pagination — same as before):
 *   <Table columns={columns} rows={rows} />
 *
 * With sorting — mark a column sortable, optionally provide a custom
 * comparator (defaults to string compare on the column's value):
 *   { key: "employee_name", label: "Employee", sortable: true }
 *   { key: "start_date", label: "Start date", sortable: true,
 *     sortFn: (a, b) => new Date(a.start_date) - new Date(b.start_date) }
 *
 * With pagination — pass a pageSize:
 *   <Table columns={columns} rows={rows} pageSize={25} />
 *
 * With a page-size selector (controlled by the parent, like the old
 * antd showSizeChanger):
 *   <Table
 *     columns={columns} rows={rows}
 *     pageSize={pageSize} pageSizeOptions={[25, 50, 75, 100]}
 *     onPageSizeChange={setPageSize}
 *   />
 *
 * With SERVER-SIDE pagination — when only the current page's rows are
 * ever loaded (e.g. an API that returns 50 of 5,000 records at a time),
 * pass serverPagination instead of pageSize. `rows` should be just the
 * current page's data; the table won't slice or reset it itself:
 *   <Table
 *     columns={columns} rows={currentPageRows}
 *     serverPagination={{
 *       page: pagination.current,
 *       pageSize: pagination.pageSize,
 *       total: totalCount,
 *       onPageChange: (p) => setPagination(prev => ({ ...prev, current: p })),
 *       pageSizeOptions: [20, 50, 100, 200],
 *       onPageSizeChange: (s) => setPagination(prev => ({ ...prev, pageSize: s, current: 1 })),
 *     }}
 *   />
 * Sorting still works but only sorts the currently-loaded page, same as
 * it would with any other client-side sort over server-paginated data.
 *
 * col.render receives (row, absoluteIndex) — absoluteIndex accounts for
 * the current page, so an "SL No." column can do `absoluteIndex + 1`.
 *
 * With row selection (checkboxes, e.g. for a bulk action toolbar) — same
 * shape as antd's rowSelection, so it's a drop-in replacement:
 *   <Table
 *     columns={columns} rows={rows} getRowId={(r) => r.id}
 *     rowSelection={{
 *       selectedRowKeys,
 *       onChange: setSelectedRowKeys,
 *       getCheckboxProps: (row) => ({ disabled: !row.eligible }),
 *     }}
 *   />
 */
export default function Table({
  columns = [],
  rows = [],
  emptyMessage = "No records found.",
  loading = false,
  getRowId,
  getRowClassName,
  onRowClick,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  serverPagination,
  rowSelection,
  maxHeight,
}) {
  const safeColumns = columns ?? [];
  const safeRows = rows ?? [];

  // Builds the inline style for a th/td: text-align from col.align, and
  // — when col.width is set — a fixed column width with content
  // truncated to an ellipsis rather than wrapping or forcing the whole
  // table wider. isBody adds the truncation-specific properties, which
  // only make sense once real content (not just the header label) is
  // in the cell.
  const cellStyle = (col, isBody = false) => {
    const style = {};
    if (col.align) style.textAlign = col.align;
    if (col.width) {
      style.width = col.width;
      style.maxWidth = col.width;
      if (isBody) {
        style.overflow = "hidden";
        style.textOverflow = "ellipsis";
      }
    }
    return Object.keys(style).length ? style : undefined;
  };

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(null); // 'asc' | 'desc' | null
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the underlying data or page size changes,
  // so you never land on an empty out-of-range page. Not applicable in
  // server-pagination mode — there, a "rows changed" event usually *is*
  // the page changing, and the current page is owned by the parent.
  useEffect(() => {
    if (!serverPagination) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, pageSize]);

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDir) return safeRows;
    const col = safeColumns.find((c) => c.key === sortKey);
    const arr = [...safeRows];
    arr.sort((a, b) => {
      const result = col?.sortFn
        ? col.sortFn(a, b)
        : String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""));
      return sortDir === "asc" ? result : -result;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRows, sortKey, sortDir]);

  const effectivePage = serverPagination ? serverPagination.page : page;
  const effectivePageSize = serverPagination
    ? serverPagination.pageSize
    : (pageSize || sortedRows.length || 1);
  const totalRowCount = serverPagination ? serverPagination.total : sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRowCount / effectivePageSize));
  // Server-paginated rows are already just the current page — never slice them again.
  const pagedRows = serverPagination
    ? sortedRows
    : pageSize
    ? sortedRows.slice((page - 1) * pageSize, page * pageSize)
    : sortedRows;

  const goToPage = (p) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    if (serverPagination) serverPagination.onPageChange(clamped);
    else setPage(clamped);
  };

  const handleSort = (col) => {
    if (!col.sortable) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const isRowSelectable = (row) => {
    if (!rowSelection?.getCheckboxProps) return true;
    return !rowSelection.getCheckboxProps(row).disabled;
  };

  const toggleRow = (rowId, checked) => {
    const current = rowSelection.selectedRowKeys || [];
    const next = checked ? [...current, rowId] : current.filter((k) => k !== rowId);
    rowSelection.onChange(next);
  };

  const toggleAllOnPage = (pageRows, checked) => {
    const current = new Set(rowSelection.selectedRowKeys || []);
    pageRows.forEach((row) => {
      if (!isRowSelectable(row)) return;
      const id = getRowId ? getRowId(row) : row;
      if (checked) current.add(id);
      else current.delete(id);
    });
    rowSelection.onChange([...current]);
  };

  return (
    <div
      className={`table-wrapper${maxHeight ? " has-max-height" : ""}`}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
    >
      <table className="app-table">
        <thead>
          <tr>
            {rowSelection && (
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  checked={
                    pagedRows.length > 0 &&
                    pagedRows.filter(isRowSelectable).every((row) =>
                      (rowSelection.selectedRowKeys || []).includes(getRowId ? getRowId(row) : row)
                    ) &&
                    pagedRows.some(isRowSelectable)
                  }
                  onChange={(e) => toggleAllOnPage(pagedRows, e.target.checked)}
                />
              </th>
            )}
            {safeColumns.map((col) => (
              <th
                key={col.key}
                className={col.sortable ? "is-sortable" : undefined}
                style={cellStyle(col)}
                onClick={() => handleSort(col)}
              >
                {col.label}
                {col.sortable && (
                  <span className="sort-indicator">
                    {sortKey === col.key
                      ? sortDir === "asc"
                        ? " \u25B2"
                        : " \u25BC"
                      : " \u21C5"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((row, i) => {
            const absoluteIndex = (effectivePage - 1) * effectivePageSize + i;
            const rowId = getRowId ? getRowId(row) : absoluteIndex;
            const isSelected = rowSelection && (rowSelection.selectedRowKeys || []).includes(rowId);
            const callerClass = getRowClassName ? getRowClassName(row, absoluteIndex) : "";
            const rowClassName = [callerClass, isSelected ? "is-selected" : ""].filter(Boolean).join(" ") || undefined;
            return (
              <tr
                key={rowId}
                className={rowClassName}
                onClick={onRowClick ? () => onRowClick(row, absoluteIndex) : undefined}
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {rowSelection && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      disabled={!isRowSelectable(row)}
                      onChange={(e) => toggleRow(rowId, e.target.checked)}
                    />
                  </td>
                )}
                {safeColumns.map((col) => (
                  <td key={col.key} data-label={col.label} style={cellStyle(col, true)}>
                    {col.render ? col.render(row, absoluteIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {loading && <div className="table-empty">Loading…</div>}
      {!loading && sortedRows.length === 0 && (
        <div className="table-empty">{emptyMessage}</div>
      )}

      {!loading && (pageSize || serverPagination) && totalRowCount > 0 && (
        <div className="table-footer">
          <span className="table-footer-info">
            {(effectivePage - 1) * effectivePageSize + 1}
            {"\u2013"}
            {Math.min(effectivePage * effectivePageSize, totalRowCount)} of {totalRowCount}
          </span>
          <div className="table-footer-controls">
            {(serverPagination ? serverPagination.pageSizeOptions && serverPagination.onPageSizeChange : pageSizeOptions && onPageSizeChange) && (
              <select
                className="page-size-select"
                value={effectivePageSize}
                onChange={(e) => {
                  const size = Number(e.target.value);
                  if (serverPagination) serverPagination.onPageSizeChange(size);
                  else onPageSizeChange(size);
                }}
              >
                {(serverPagination ? serverPagination.pageSizeOptions : pageSizeOptions).map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            )}
            <div className="table-pagination-buttons">
              <button
                className="btn btn-secondary"
                disabled={effectivePage === 1}
                onClick={() => goToPage(effectivePage - 1)}
              >
                Prev
              </button>
              <span className="table-pagination-page">
                {effectivePage} / {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={effectivePage === totalPages}
                onClick={() => goToPage(effectivePage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}