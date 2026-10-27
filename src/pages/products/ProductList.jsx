import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Filter, Plus, Trash2, Pencil, X, Zap, Package, PackageX, Download, CheckCircle, Ban, Store, FileText, MapPin } from "lucide-react";
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
import {
  useDeleteProductMutation,
  useGetProductCategoriesQuery,
  useGetProductsQuery,
  useBulkUpdateProductStatusMutation,
  useBulkDeleteProductsMutation,
} from "../../services/productApi";
import { useGetMyStoreQuery } from "../../services/storeApi";

const initialFilters = { categoryId: "", isActive: "", availabilityType: "" };

export default function ProductList() {
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth?.accessToken);
  const user = useSelector((state) => state.auth?.user);
  const isStoreOwner = user?.role === "store_owner";

  const { data: storeResponse } = useGetMyStoreQuery(undefined, {
    skip: !isStoreOwner,
  });

  const isLocationMissing =
    isStoreOwner &&
    storeResponse?.store &&
    (storeResponse.store.latitude == null || storeResponse.store.longitude == null);

  const [searchText, setSearchText] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [pendingFilters, setPendingFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);

  const [deleteProduct, { isLoading: isDeleting, error: deleteError }] =
    useDeleteProductMutation();
  const [bulkUpdateStatus, { isLoading: isBulkUpdating }] =
    useBulkUpdateProductStatusMutation();
  const [bulkDeleteProducts, { isLoading: isBulkDeleting }] =
    useBulkDeleteProductsMutation();

  const debouncedQuery = useDebouncedValue(searchText);
  const params = useMemo(
    () => ({
      page,
      limit,
      sortBy,
      sortOrder,
      ...(debouncedQuery.trim() ? { search: debouncedQuery.trim() } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.isActive !== "" ? { isActive: filters.isActive } : {}),
      ...(filters.availabilityType ? { availabilityType: filters.availabilityType } : {}),
      // Admin sees only Admin products in master product list
      ...(!isStoreOwner ? { admin_only: true } : {}),
    }),
    [page, limit, debouncedQuery, filters, sortBy, sortOrder, isStoreOwner]
  );
  const {
    data: productResponse,
    isLoading,
    error,
  } = useGetProductsQuery(params);
  const { data: categoryResponse } = useGetProductCategoriesQuery();
  const rows = (productResponse?.data || []).map((product) => ({
    ...product,
    category: product.category_name || "—",
    status: (product.availability_type === "MADE_TO_ORDER" || product.is_active)
      ? "Active"
      : "Out of stock",
  }));
  const pagination = productResponse?.pagination;

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

  const productColumns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Product Name" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price (₹)" },
    { key: "stock", label: "Stock" },
    {
      key: "availability_type",
      label: "Fulfillment",
      getValue: (r) =>
        r.availability_type === "MADE_TO_ORDER"
          ? "Made to Order"
          : Number(r.stock) <= 0
          ? "Out of stock"
          : `In Stock (${r.stock})`,
    },
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
      toast.success(res.message || `Updated ${selectedIds.length} product(s)`);
      setSelectedIds([]);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update product statuses");
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkDeleteProducts({ ids: selectedIds }).unwrap();
      toast.success(res.message || `Deleted ${selectedIds.length} product(s)`);
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete products");
    }
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
    exportToCsv({
      filename: `products-selected-${new Date().toISOString().slice(0, 10)}`,
      columns: productColumns,
      data: selectedRows,
    });
    toast.success(`Exported ${selectedRows.length} selected product(s) to CSV`);
  };

  const handleExportAll = async () => {
    try {
      setIsExportingAll(true);
      const queryParams = new URLSearchParams({
        ...(debouncedQuery.trim() ? { search: debouncedQuery.trim() } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.isActive !== "" ? { isActive: filters.isActive } : {}),
        ...(filters.availabilityType ? { availabilityType: filters.availabilityType } : {}),
      });

      const response = await fetch(`/api/v1/products/export?${queryParams.toString()}`, {
        credentials: "include",
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export products");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Products exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export products CSV");
    } finally {
      setIsExportingAll(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteProduct(productToDelete.id).unwrap();
      setProductToDelete(null);
    } catch {
      // The API error is rendered in the dialog.
    }
  };

  return (
    <>
      <div className="section-head">
        <div>
          <h1>{isStoreOwner ? "My Store Products" : "Admin Products"}</h1>
          <p>
            {isStoreOwner
              ? "Manage products for your store branch."
              : "Manage official master bakery products created by Admin."}
          </p>
        </div>
        <Button
          onClick={() => {
            if (isLocationMissing) {
              toast.error(
                "Please set your Bakery Store Location first before adding products."
              );
              navigate("/store-location");
              return;
            }
            navigate("/products/create");
          }}
        >
          <Plus size={18} /> Add product
        </Button>
      </div>

      {/* Store Location Notice Banner */}
      {isLocationMissing && (
        <div className="alert alert-warning border-warning-subtle shadow-xs rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4 py-2.5 px-3">
          <div className="d-flex align-items-center gap-2">
            <Store size={18} className="text-warning-emphasis flex-shrink-0" />
            <span className="small text-dark fw-medium">
              <strong>Location Setup Required:</strong> Please set your store location on the map to define your delivery area before creating products.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/store-location")}
            className="d-flex align-items-center gap-1.5 py-1 px-3"
          >
            <MapPin size={14} />
            <span>Set Location Now</span>
          </Button>
        </div>
      )}

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
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#6253e8" }}>Total Products</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827", marginTop: "4px" }}>
            {productResponse?.summary?.total ?? pagination?.totalItems ?? rows.length}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #16a34a" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>Active Products</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>
            {productResponse?.summary?.active ?? rows.filter((r) => r.is_active).length}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #dc2626" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626" }}>Inactive / Hidden</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626", marginTop: "4px" }}>
            {productResponse?.summary?.inactive ?? rows.filter((r) => !r.is_active).length}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #d97706" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#d97706" }}>Categories</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#d97706", marginTop: "4px" }}>
            {productResponse?.summary?.totalCategories ?? (categoryResponse?.data || []).length}
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
            placeholder="Search products"
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
              variant="outline"
              onClick={handleExportAll}
              disabled={isExportingAll}
              loading={isExportingAll}
              title="Export all matching products as CSV"
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
              Category
              <Select
                value={pendingFilters.categoryId}
                onChange={(event) =>
                  setPendingFilters((value) => ({
                    ...value,
                    categoryId: event.target.value,
                  }))
                }
              >
                <option value="">All categories</option>
                {(categoryResponse?.data || []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </label>

            <label>
              Fulfillment Type
              <Select
                value={pendingFilters.availabilityType}
                onChange={(event) =>
                  setPendingFilters((value) => ({
                    ...value,
                    availabilityType: event.target.value,
                  }))
                }
              >
                <option value="">All fulfillment types</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="MADE_TO_ORDER">Made to Order</option>
              </Select>
            </label>

            <label>
              Status
              <Select
                value={pendingFilters.isActive}
                onChange={(event) =>
                  setPendingFilters((value) => ({
                    ...value,
                    isActive: event.target.value,
                  }))
                }
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Out of stock</option>
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
            {error.data?.message || "Unable to load products"}
          </p>
        )}
        {selectedIds.length > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
            itemLabel="products"
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
              key: "name",
              label: "PRODUCT",
              render: (value) => (
                <div className="product-name" title={value}>
                  <b title={value}>{value}</b>
                </div>
              ),
              sortable: true,
            },
            { key: "category", label: "CATEGORY", sortable: true },
            { key: "price", label: "PRICE", render: (value) => `₹${value}`, sortable: true },
            {
              key: "availability_type",
              label: "FULFILLMENT",
              render: (value, item) => {
                if (item.availability_type === "MADE_TO_ORDER") {
                  return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, background: "#fef3eb", color: "#e86b1a" }}>
                      <Zap size={12} /> Made to Order
                    </span>
                  );
                }
                const stockNum = Number(item.stock) || 0;
                if (stockNum <= 0) {
                  return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, background: "#fef2f2", color: "#dc2626" }}>
                      <PackageX size={12} /> Out of stock
                    </span>
                  );
                }
                return (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, background: "#f0fdf4", color: "#16a34a" }}>
                    <Package size={12} /> In Stock ({stockNum})
                  </span>
                );
              },
              sortable: true,
            },
            {
              key: "status",
              label: "STATUS",
              render: (value) => (
                <em className={value === "Active" ? "active" : "inactive"}>
                  {value}
                </em>
              ),
              sortable: true,
            },
          ]}
          data={rows}
          emptyMessage="No products found."
          renderActions={(product) => (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Button
                variant="edit"
                title={`Edit ${product.name}`}
                aria-label={`Edit ${product.name}`}
                onClick={() => navigate(`/products/${product.id}/edit`)}
              >
                <Pencil size={15} />
              </Button>
              <Button
                variant="delete"
                title={`Delete ${product.name}`}
                aria-label={`Delete ${product.name}`}
                onClick={() => setProductToDelete(product)}
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
          itemLabel="products"
        />
      </div>
      {productToDelete && (
        <ConfirmDialog
          title="Delete product?"
          message={`Delete ${productToDelete.name}? This cannot be undone.`}
          confirmLabel="Delete product"
          onConfirm={confirmDelete}
          onClose={() => setProductToDelete(null)}
          isLoading={isDeleting}
          error={deleteError?.data?.message}
        />
      )}
      {bulkDeleteConfirmOpen && (
        <ConfirmDialog
          title="Delete selected products?"
          message={`Are you sure you want to delete ${selectedIds.length} selected product(s)? This action cannot be undone.`}
          confirmLabel={`Delete ${selectedIds.length} products`}
          onConfirm={confirmBulkDelete}
          onClose={() => setBulkDeleteConfirmOpen(false)}
          isLoading={isBulkDeleting}
        />
      )}
    </>
  );
}
