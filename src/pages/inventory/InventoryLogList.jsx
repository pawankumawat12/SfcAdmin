import { useState, useMemo } from "react";
import {
  History,
  Filter,
  RefreshCw,
  X,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  AlertCircle,
  Trash2,
} from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import Pagination from "../../components/ui/Pagination";
import useDebouncedValue from "../../utils/useDebouncedValue";
import {
  useGetStockLogsQuery,
  useGetIngredientsQuery,
} from "../../services/inventoryApi";

export default function InventoryLogList() {
  const [searchOrderId, setSearchOrderId] = useState("");
  const debouncedOrder = useDebouncedValue(searchOrderId);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [selectedChangeType, setSelectedChangeType] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data: ingredientsData } = useGetIngredientsQuery({ limit: 100 });
  const ingredients = ingredientsData?.data || [];

  const params = useMemo(
    () => ({
      page,
      limit,
      ...(debouncedOrder.trim() ? { orderId: debouncedOrder.trim() } : {}),
      ...(selectedIngredient ? { ingredientId: selectedIngredient } : {}),
      ...(selectedChangeType ? { changeType: selectedChangeType } : {}),
    }),
    [page, limit, debouncedOrder, selectedIngredient, selectedChangeType]
  );

  const { data: response, isLoading, error, refetch } = useGetStockLogsQuery(params);
  const logs = response?.data || [];
  const pagination = response?.pagination;

  const renderTypeBadge = (type) => {
    switch (type) {
      case "ORDER_CONSUMED":
        return (
          <em className="warning" style={{ background: "#eef2ff", color: "#4f46e5" }}>
            Order Consumed
          </em>
        );
      case "ORDER_CANCELLED_RESTORE":
        return <em className="active">Cancelled (Restored)</em>;
      case "ORDER_CANCELLED_SKIPPED":
        return <em className="inactive">Cancelled (Non-Restorable)</em>;
      case "PURCHASE_RESTOCK":
        return (
          <em className="active" style={{ background: "#f0fdf4", color: "#15803d" }}>
            Purchase Restock
          </em>
        );
      case "WASTAGE":
        return <em className="inactive">Wastage / Spoilage</em>;
      case "MANUAL_ADJUSTMENT":
      default:
        return <em className="warning">Manual Adjustment</em>;
    }
  };

  const columns = [
    {
      key: "created_at",
      label: "DATE & TIME",
      render: (val) => (
        <span style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
          {new Date(val).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "change_type",
      label: "MOVEMENT TYPE",
      render: (val) => renderTypeBadge(val),
    },
    {
      key: "ingredient_name",
      label: "RAW MATERIAL",
      render: (val, row) => (
        <div>
          <strong style={{ color: "var(--ink, #1f2937)", fontSize: "13px" }}>{val}</strong>
          <span style={{ color: "var(--muted)", fontSize: "11px", marginLeft: "4px" }}>
            ({row.base_unit})
          </span>
        </div>
      ),
    },
    {
      key: "quantity_changed",
      label: "QUANTITY CHANGED",
      render: (val, row) => {
        const qty = Number(val || 0);
        const isPositive = qty > 0;
        const isZero = qty === 0;

        return (
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              fontWeight: 600,
              color: isZero ? "var(--muted)" : isPositive ? "#26945c" : "#dc2626",
            }}
          >
            {isPositive ? `+${qty}` : qty} {row.base_unit}
          </span>
        );
      },
    },
    {
      key: "stock_after",
      label: "BALANCE AFTER",
      render: (val, row) => (
        <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600 }}>
          {val} {row.base_unit}
        </span>
      ),
    },
    {
      key: "reason",
      label: "REASON & ORDER REFERENCE",
      render: (val, row) => (
        <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
          <div style={{ color: "var(--ink)" }}>{val || "—"}</div>
          {row.order_id && (
            <small style={{ color: "var(--purple)", fontWeight: 600 }}>
              Order #{row.order_id}
            </small>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Stock Movement & Audit Trail</h1>
          <p>Chronological history of raw material usage, restocks, and cancellation restock decisions.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw size={15} /> Refresh
        </Button>
      </div>

      <div className="card table-card">
        <div className="table-toolbar">
          <SearchInput
            value={searchOrderId}
            onChange={(e) => {
              setSearchOrderId(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Order ID (e.g. 65)..."
          />
          <Button
            variant="outline"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            <Filter size={16} /> Filter
          </Button>
        </div>

        {filtersOpen && (
          <form className="product-filter-bar" onSubmit={(e) => e.preventDefault()}>
            <label>
              Movement Type
              <Select
                value={selectedChangeType}
                onChange={(e) => {
                  setSelectedChangeType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Movement Types</option>
                <option value="ORDER_CONSUMED">Order Consumed</option>
                <option value="ORDER_CANCELLED_RESTORE">Order Cancelled (Restored)</option>
                <option value="ORDER_CANCELLED_SKIPPED">Order Cancelled (Non-Restorable)</option>
                <option value="PURCHASE_RESTOCK">Purchase Restock</option>
                <option value="WASTAGE">Wastage / Spoilage</option>
                <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
              </Select>
            </label>

            <label>
              Raw Material
              <Select
                value={selectedIngredient}
                onChange={(e) => {
                  setSelectedIngredient(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Ingredients</option>
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </label>

            <div className="filter-actions">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedIngredient("");
                  setSelectedChangeType("");
                  setSearchOrderId("");
                  setPage(1);
                }}
              >
                Clear
              </Button>
              <Button
                variant="plain"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X size={17} />
              </Button>
            </div>
          </form>
        )}

        {error && (
          <p className="error table-error">
            {error.data?.message || "Unable to load stock movement logs"}
          </p>
        )}

        <DataTable
          loading={isLoading}
          columns={columns}
          data={logs}
          emptyMessage="No stock movement logs found."
        />

        {pagination && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
            itemLabel="logs"
          />
        )}
      </div>
    </>
  );
}
