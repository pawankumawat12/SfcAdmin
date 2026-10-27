import { useState, useMemo } from "react";
import {
  Boxes,
  Plus,
  Filter,
  Pencil,
  Trash2,
  ArrowUpDown,
  AlertTriangle,
  RotateCcw,
  Download,
  X,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import Pagination from "../../components/ui/Pagination";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import useDebouncedValue from "../../utils/useDebouncedValue";
import { exportToCsv } from "../../utils/csvExport";
import {
  useGetIngredientsQuery,
  useDeleteIngredientMutation,
} from "../../services/inventoryApi";
import IngredientModal from "../../modals/IngredientModal";
import StockAdjustModal from "../../modals/StockAdjustModal";

export default function IngredientList() {
  const [searchText, setSearchText] = useState("");
  const debouncedQuery = useDebouncedValue(searchText);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStockStatus, setSelectedStockStatus] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustIngredient, setAdjustIngredient] = useState(null);

  const [ingredientToDelete, setIngredientToDelete] = useState(null);

  const params = useMemo(
    () => ({
      page,
      limit,
      admin_only: true, // STRICT REQUIREMENT: Only Admin's raw materials, never other stores
      ...(debouncedQuery.trim() ? { search: debouncedQuery.trim() } : {}),
      ...(selectedCategory ? { category: selectedCategory } : {}),
      ...(selectedStockStatus ? { stockStatus: selectedStockStatus } : {}),
    }),
    [page, limit, debouncedQuery, selectedCategory, selectedStockStatus]
  );

  const { data: response, isLoading, error, refetch } = useGetIngredientsQuery(params);
  const ingredients = response?.data || [];
  const pagination = response?.pagination;

  const [deleteIngredient, { isLoading: isDeleting }] = useDeleteIngredientMutation();

  // Metrics for stats row
  const totalItems = response?.summary?.totalItems ?? (pagination?.total || ingredients.length);
  const lowStockCount =
    response?.summary?.lowStockCount ??
    ingredients.filter(
      (i) => Number(i.current_stock) <= Number(i.min_stock_threshold) && Number(i.current_stock) > 0
    ).length;
  const outOfStockCount =
    response?.summary?.outOfStockCount ??
    ingredients.filter((i) => Number(i.current_stock) <= 0).length;
  const totalStockValue =
    response?.summary?.totalStockValue ??
    ingredients.reduce(
      (acc, i) => acc + (Number(i.current_stock) || 0) * (Number(i.purchase_price) || 0),
      0
    );

  // Extract unique categories for filter
  const categories = Array.from(new Set(ingredients.map((i) => i.category).filter(Boolean)));

  const handleEdit = (item) => {
    setSelectedIngredient(item);
    setIsIngredientModalOpen(true);
  };

  const handleAdjust = (item) => {
    setAdjustIngredient(item);
    setIsAdjustModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!ingredientToDelete) return;
    try {
      await deleteIngredient(ingredientToDelete.id).unwrap();
      toast.success("Ingredient deleted successfully");
      setIngredientToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete ingredient");
    }
  };

  const handleExportAll = () => {
    exportToCsv({
      filename: `raw-materials-${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { key: "name", label: "Ingredient Name" },
        { key: "category", label: "Category" },
        { key: "current_stock", label: "Current Stock" },
        { key: "base_unit", label: "Unit" },
        { key: "min_stock_threshold", label: "Low Stock Limit" },
        { key: "purchase_price", label: "Cost Per Unit" },
        {
          key: "restore_stock_on_cancel",
          label: "Restorable On Cancel",
          getValue: (r) => (r.restore_stock_on_cancel ? "Yes" : "No"),
        },
        { key: "supplier_name", label: "Supplier" },
      ],
      data: ingredients,
    });
    toast.success(`Exported ${ingredients.length} raw materials to CSV`);
  };

  const columns = [
    {
      key: "name",
      label: "RAW MATERIAL",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--ink, #1f2937)" }}>{row.name}</div>
          {row.batch_number && (
            <small style={{ color: "var(--muted, #6d6c80)", fontSize: "11px" }}>
              Lot: {row.batch_number}
            </small>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "CATEGORY",
      render: (val) => <span style={{ color: "#505064", fontSize: "12px" }}>{val || "General"}</span>,
    },
    {
      key: "current_stock",
      label: "CURRENT STOCK",
      render: (_, row) => {
        const isLow = Number(row.current_stock) <= Number(row.min_stock_threshold);
        const isOut = Number(row.current_stock) <= 0;

        return (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <strong
              style={{
                fontFamily: "monospace",
                fontSize: "14px",
                color: isOut ? "#dc2626" : isLow ? "#db8c2d" : "#26945c",
              }}
            >
              {row.current_stock}
            </strong>
            <small style={{ color: "var(--muted, #6d6c80)", fontSize: "11px" }}>{row.base_unit}</small>
            {isOut ? (
              <em className="inactive">Out</em>
            ) : isLow ? (
              <em className="warning">Low</em>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "min_stock_threshold",
      label: "LOW STOCK LIMIT",
      render: (val, row) => (
        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--muted)" }}>
          {val} {row.base_unit}
        </span>
      ),
    },
    {
      key: "purchase_price",
      label: "COST / UNIT",
      render: (val) => (
        <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "13px" }}>
          ₹{Number(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "restore_stock_on_cancel",
      label: "CANCEL RESTOCK?",
      render: (val) =>
        val ? (
          <em className="active">Restorable</em>
        ) : (
          <em className="inactive">Consumed in Prep</em>
        ),
    },
    {
      key: "supplier_name",
      label: "SUPPLIER",
      render: (val, row) =>
        val ? (
          <div>
            <div style={{ fontWeight: 500, fontSize: "12px" }}>{val}</div>
            {row.supplier_phone && (
              <small style={{ color: "var(--muted)", fontSize: "10px" }}>{row.supplier_phone}</small>
            )}
          </div>
        ) : (
          <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "11px" }}>None</span>
        ),
    },
  ];

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Raw Materials & Ingredients</h1>
          <p>Monitor raw food inventory, individual alert thresholds, and cancellation restock behavior.</p>
        </div>
        <Button
          onClick={() => {
            setSelectedIngredient(null);
            setIsIngredientModalOpen(true);
          }}
        >
          <Plus size={18} /> Add Raw Material
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="stats">
        <div className="stat-card">
          <span className="stat-icon purple">
            <Boxes size={18} />
          </span>
          <span>Total Raw Materials</span>
          <strong>{totalItems}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-icon orange">
            <AlertTriangle size={18} />
          </span>
          <span>Low Stock Limit Reached</span>
          <strong style={{ color: "#db8c2d" }}>{lowStockCount}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-icon pink">
            <TrendingDown size={18} />
          </span>
          <span>Out of Stock Items</span>
          <strong style={{ color: "#dc2626" }}>{outOfStockCount}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-icon blue">
            <DollarSign size={18} />
          </span>
          <span>Estimated Inventory Value</span>
          <strong>₹{totalStockValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
        </div>
      </div>

      {/* Table Card */}
      <div className="card table-card">
        <div className="table-toolbar">
          <SearchInput
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder="Search raw material or supplier..."
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
              variant="outline"
              onClick={handleExportAll}
              title="Export all visible raw materials as CSV"
            >
              <Download size={16} /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              <Filter size={16} /> Filter
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        {filtersOpen && (
          <form className="product-filter-bar" onSubmit={(e) => e.preventDefault()}>
            <label>
              Category
              <Select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </label>

            <label>
              Stock Status
              <Select
                value={selectedStockStatus}
                onChange={(e) => {
                  setSelectedStockStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Stock Levels</option>
                <option value="low_stock">⚠️ Low Stock Only</option>
                <option value="out_of_stock">⛔ Out of Stock Only</option>
                <option value="normal">✅ Normal Stock</option>
              </Select>
            </label>

            <div className="filter-actions">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory("");
                  setSelectedStockStatus("");
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
            {error.data?.message || "Unable to load raw materials"}
          </p>
        )}

        <DataTable
          loading={isLoading}
          columns={columns}
          data={ingredients}
          emptyMessage="No raw materials or ingredients found."
          renderActions={(item) => (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Button
                variant="action"
                title={`Adjust stock for ${item.name}`}
                aria-label={`Adjust stock for ${item.name}`}
                onClick={() => handleAdjust(item)}
              >
                <ArrowUpDown size={15} />
              </Button>
              <Button
                variant="edit"
                title={`Edit ${item.name}`}
                aria-label={`Edit ${item.name}`}
                onClick={() => handleEdit(item)}
              >
                <Pencil size={15} />
              </Button>
              <Button
                variant="delete"
                title={`Delete ${item.name}`}
                aria-label={`Delete ${item.name}`}
                onClick={() => setIngredientToDelete(item)}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          )}
        />

        {pagination && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit || limit}
            onPageChange={setPage}
            itemLabel="raw materials"
          />
        )}
      </div>

      {/* Ingredient Modal */}
      <IngredientModal
        isOpen={isIngredientModalOpen}
        onClose={() => {
          setIsIngredientModalOpen(false);
          setSelectedIngredient(null);
        }}
        ingredient={selectedIngredient}
        onSuccess={() => refetch()}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustIngredient(null);
        }}
        ingredient={adjustIngredient}
      />

      {/* Delete Confirmation Dialog */}
      {ingredientToDelete && (
        <ConfirmDialog
          title="Delete Raw Material"
          message={`Are you sure you want to delete "${ingredientToDelete.name}"? This action cannot be undone if not used in any recipes.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onClose={() => setIngredientToDelete(null)}
          isLoading={isDeleting}
        />
      )}
    </>
  );
}
