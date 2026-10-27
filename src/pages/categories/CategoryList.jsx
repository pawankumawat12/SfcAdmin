import { useMemo, useState } from "react";
import { Filter, Pencil, Plus, Trash2, X, Download, CheckCircle, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DataTable from "../../components/common/DataTable";
import BulkActionBar from "../../components/common/BulkActionBar";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import Pagination from "../../components/ui/Pagination";
import useDebouncedValue from "../../utils/useDebouncedValue";
import { exportToCsv } from "../../utils/csvExport";
import { toAssetUrl } from "../../utils/assetUrl";
import {
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useBulkUpdateCategoryStatusMutation,
  useBulkDeleteCategoriesMutation,
} from "../../services/categoryApi";

const initialFilters = { isActive: "" };

export default function CategoryList() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [pendingFilters, setPendingFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const debouncedQuery = useDebouncedValue(searchText);
  const [deleteCategory, { isLoading: isDeleting, error: deleteError }] =
    useDeleteCategoryMutation();
  const [bulkUpdateStatus, { isLoading: isBulkUpdating }] =
    useBulkUpdateCategoryStatusMutation();
  const [bulkDeleteCategories, { isLoading: isBulkDeleting }] =
    useBulkDeleteCategoriesMutation();
  const params = useMemo(
    () => ({
      page,
      limit,
      sortBy,
      sortOrder,
      ...(debouncedQuery.trim() ? { search: debouncedQuery.trim() } : {}),
      ...(filters.isActive !== "" ? { isActive: filters.isActive } : {}),
    }),
    [page, limit, sortBy, sortOrder, debouncedQuery, filters]
  );
  const {
    data: categoryResponse,
    isLoading,
    error,
  } = useGetCategoriesQuery(params);
  const categories = (categoryResponse?.data || []).map((category) => ({
    ...category,
    status: category.is_active ? "Active" : "Inactive",
  }));
  const pagination = categoryResponse?.pagination;

  const applyFilters = () => {
    setFilters(pendingFilters);
    setPage(1);
    setFiltersOpen(false);
  };
  const clearFilters = () => {
    setPendingFilters(initialFilters);
    setFilters(initialFilters);
    setPage(1);
  };
  const handleSort = (nextSortBy, nextSortOrder) => {
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  };

  const categoryColumns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Category Name" },
    { key: "description", label: "Description" },
    { key: "status", label: "Status" },
    {
      key: "created_at",
      label: "Created At",
      getValue: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : ""),
    },
  ];

  const handleSelectAll = (checked, pageIds) => {
    setSelectedIds((prev) =>
      checked
        ? [...new Set([...prev, ...pageIds])]
        : prev.filter((id) => !pageIds.includes(id))
    );
  };

  const handleSelectRow = (id, checked) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((i) => i !== id)
    );
  };

  const handleBulkStatusChange = async (isActive) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkUpdateStatus({ ids: selectedIds, isActive }).unwrap();
      toast.success(res.message || `Updated ${selectedIds.length} categories`);
      setSelectedIds([]);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update category statuses");
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkDeleteCategories({ ids: selectedIds }).unwrap();
      toast.success(res.message || `Deleted ${selectedIds.length} categories`);
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete categories");
    }
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedRows = categories.filter((c) => selectedIds.includes(c.id));
    exportToCsv({
      filename: `categories-selected-${new Date().toISOString().slice(0, 10)}`,
      columns: categoryColumns,
      data: selectedRows,
    });
    toast.success(`Exported ${selectedRows.length} selected categories to CSV`);
  };

  const handleExportAll = () => {
    exportToCsv({
      filename: `categories-export-${new Date().toISOString().slice(0, 10)}`,
      columns: categoryColumns,
      data: categories,
    });
    toast.success(`Exported ${categories.length} categories to CSV`);
  };

  const confirmDelete = async () => {
    try {
      await deleteCategory(categoryToDelete.id).unwrap();
      setCategoryToDelete(null);
    } catch {
      // The API error is rendered in the dialog.
    }
  };

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Categories</h1>
          <p>Organise menu items into useful collections.</p>
        </div>
        <Button onClick={() => navigate("/categories/create")}>
          <Plus size={18} /> Add category
        </Button>
      </div>

      {/* Top Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #6253e8" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#6253e8" }}>Total Categories</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827", marginTop: "4px" }}>
            {categoryResponse?.summary?.total ?? pagination?.totalItems ?? categories.length}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #16a34a" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>Active Categories</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>
            {categoryResponse?.summary?.active ?? categories.filter((c) => c.is_active).length}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #dc2626" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626" }}>Inactive Categories</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626", marginTop: "4px" }}>
            {categoryResponse?.summary?.inactive ?? categories.filter((c) => !c.is_active).length}
          </div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-toolbar">
          <SearchInput
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
              setPage(1);
            }}
            placeholder="Search categories"
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
              variant="outline"
              onClick={handleExportAll}
              title="Export all visible categories as CSV"
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
        {filtersOpen && (
          <form className="product-filter-bar">
            <label>
              Status
              <Select
                value={pendingFilters.isActive}
                onChange={(event) =>
                  setPendingFilters({ isActive: event.target.value })
                }
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </label>
            <div className="filter-actions">
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
              <Button onClick={applyFilters}>Apply</Button>
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
            {error.data?.message || "Unable to load categories"}
          </p>
        )}
        {selectedIds.length > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
            itemLabel="categories"
          >
            <Button
              variant="outline"
              onClick={() => handleBulkStatusChange(true)}
              disabled={isBulkUpdating}
              style={{ fontSize: "13px", padding: "5px 10px" }}
            >
              <CheckCircle size={14} color="#16a34a" /> Activate
            </Button>
            <Button
              variant="outline"
              onClick={() => handleBulkStatusChange(false)}
              disabled={isBulkUpdating}
              style={{ fontSize: "13px", padding: "5px 10px" }}
            >
              <Ban size={14} color="#dc2626" /> Deactivate
            </Button>
            <Button
              variant="outline"
              onClick={handleExportSelected}
              style={{ fontSize: "13px", padding: "5px 10px" }}
            >
              <Download size={14} /> Export Selected
            </Button>
            <Button
              variant="danger"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              disabled={isBulkDeleting}
              style={{ fontSize: "13px", padding: "5px 10px" }}
            >
              <Trash2 size={14} /> Delete Selected
            </Button>
          </BulkActionBar>
        )}
        <DataTable
          loading={isLoading}
          selectable={true}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          columns={[
            {
              key: "image",
              label: "IMAGE",
              render: (value) => {
                
                if (!value) {
                  return <span className="muted">No image</span>;
                }
                return (
                  <img
                    src={toAssetUrl(value)}
                    alt="Category"
                    className="table-image"
                  />
                );
              },
            },
            { key: "name", label: "NAME", sortable: true },
            { key: "description", label: "DESCRIPTION", sortable: true },
            {
              key: "status",
              label: "STATUS",
              sortable: true,
              render: (value) => (
                <em className={value === "Active" ? "active" : "inactive"}>
                  {value}
                </em>
              ),
            },
          ]}
          data={categories}
          emptyMessage="No categories found."
          renderActions={(category) => (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Button
                variant="edit"
                title={`Edit ${category.name}`}
                aria-label={`Edit ${category.name}`}
                onClick={() => navigate(`/categories/${category.id}/edit`)}
              >
                <Pencil size={15} />
              </Button>
              <Button
                variant="delete"
                title={`Delete ${category.name}`}
                aria-label={`Delete ${category.name}`}
                onClick={() => setCategoryToDelete(category)}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          )}
        />
        <Pagination
          page={pagination?.page || page}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          itemLabel="categories"
        />
      </div>
      {categoryToDelete && (
        <ConfirmDialog
          title="Delete category?"
          message={`Delete ${categoryToDelete.name}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onClose={() => setCategoryToDelete(null)}
          isLoading={isDeleting}
          error={deleteError?.data?.message}
        />
      )}
      {bulkDeleteConfirmOpen && (
        <ConfirmDialog
          title="Delete selected categories?"
          message={`Are you sure you want to delete ${selectedIds.length} selected category(ies)? Categories with products assigned will be safely protected.`}
          confirmLabel={`Delete ${selectedIds.length} categories`}
          onConfirm={confirmBulkDelete}
          onClose={() => setBulkDeleteConfirmOpen(false)}
          isLoading={isBulkDeleting}
        />
      )}
    </>
  );
}
