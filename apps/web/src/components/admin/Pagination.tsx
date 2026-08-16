"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageCount: number;
  total?: number;
  onPage: (page: number) => void;
}

/** Simple prev/next pagination matching the console's light theme. */
export function Pagination({ page, pageCount, total, onPage }: PaginationProps) {
  if (pageCount <= 1 && total === undefined) return null;
  return (
    <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3">
      <p className="text-xs text-neutral-500">
        {total !== undefined ? `${total.toLocaleString("en-IN")} total · ` : ""}Page {page}
        {pageCount > 1 ? ` of ${pageCount}` : ""}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
