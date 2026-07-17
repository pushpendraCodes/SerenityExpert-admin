import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as PaginationType } from "@/types";
import { Button } from "./Button";

interface Props {
  pagination: PaginationType | null;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function Pagination({ pagination, onPageChange, loading }: Props) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, hasPrevPage, hasNextPage, total } = pagination;

  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <p className="text-sm text-muted">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevPage || loading}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
