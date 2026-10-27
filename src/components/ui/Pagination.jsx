import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 10,
  onPageChange,
  itemLabel = "records",
  className = "",
}) {
  if (totalPages <= 1) return null;

  const displayTotal = total > 0 ? total : totalPages * limit;
  const startRecord = Math.min((page - 1) * limit + 1, displayTotal);
  const endRecord = Math.min(page * limit, displayTotal);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push("...");
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`table-pagination ${className}`.trim()}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        padding: "16px 20px",
        borderTop: "1px solid #e5e7eb",
        background: "#ffffff",
        fontSize: "13px",
      }}
    >
      <div style={{ color: "#6b7280", fontWeight: 500 }}>
        {total > 0 ? (
          <>
            Showing <strong style={{ color: "#111827" }}>{startRecord}</strong>–
            <strong style={{ color: "#111827" }}>{endRecord}</strong> of{" "}
            <strong style={{ color: "#111827" }}>{total}</strong> {itemLabel}
          </>
        ) : (
          <>
            Page <strong style={{ color: "#111827" }}>{page}</strong> of{" "}
            <strong style={{ color: "#111827" }}>{totalPages}</strong>
          </>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {/* PREV BUTTON */}
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange && onPageChange(page - 1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: page <= 1 ? "#9ca3af" : "#374151",
            fontWeight: 600,
            cursor: page <= 1 ? "not-allowed" : "pointer",
            opacity: page <= 1 ? 0.6 : 1,
            transition: "all 0.15s ease",
          }}
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>

        {/* PAGE NUMBER PILLS */}
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: "0 6px",
                  color: "#9ca3af",
                  fontWeight: 700,
                }}
              >
                ...
              </span>
            );
          }

          const isActive = p === page;

          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange && onPageChange(p)}
              style={{
                minWidth: "32px",
                height: "32px",
                padding: "0 8px",
                borderRadius: "8px",
                border: isActive ? "1px solid #4f7d16" : "1px solid #e5e7eb",
                background: isActive ? "#4f7d16" : "#ffffff",
                color: isActive ? "#ffffff" : "#374151",
                fontWeight: isActive ? 700 : 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {p}
            </button>
          );
        })}

        {/* NEXT BUTTON */}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange && onPageChange(page + 1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: page >= totalPages ? "#9ca3af" : "#374151",
            fontWeight: 600,
            cursor: page >= totalPages ? "not-allowed" : "pointer",
            opacity: page >= totalPages ? 0.6 : 1,
            transition: "all 0.15s ease",
          }}
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

