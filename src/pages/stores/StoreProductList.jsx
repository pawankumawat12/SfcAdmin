import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Mail,
  User,
  Package,
  Plus,
  Trash2,
  Pencil,
  Filter,
  X,
  CheckCircle,
  Ban,
  Clock,
  CheckCircle2,
} from "lucide-react";
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
  useGetProductsQuery,
  useGetProductCategoriesQuery,
  useDeleteProductMutation,
  useBulkUpdateProductStatusMutation,
  useBulkDeleteProductsMutation,
} from "../../services/productApi";
import { useGetStoreByIdQuery } from "../../services/storeApi";

const initialFilters = { categoryId: "", isActive: "", availabilityType: "" };

export default function StoreProductList() {
  const { storeId } = useParams();
  const navigate = useNavigate();

  // Fetch store info
  const {
    data: storeData,
    isLoading: isStoreLoading,
    error: storeError,
  } = useGetStoreByIdQuery(storeId);
  const store = storeData?.store;

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

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
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
      store_id: storeId,
      ...(debouncedQuery.trim() ? { search: debouncedQuery.trim() } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.isActive !== "" ? { isActive: filters.isActive } : {}),
      ...(filters.availabilityType ? { availabilityType: filters.availabilityType } : {}),
    }),
    [page, limit, debouncedQuery, filters, sortBy, sortOrder, storeId]
  );

  const {
    data: productResponse,
    isLoading: isProductsLoading,
    error: productsError,
  } = useGetProductsQuery(params);

  const { data: categoryResponse } = useGetProductCategoriesQuery();

  const rows = (productResponse?.data || []).map((product) => ({
    ...product,
    category: product.category_name || "—",
    status:
      product.availability_type === "MADE_TO_ORDER" || product.is_active
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

  const handleDeleteSingle = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id).unwrap();
      toast.success("Product deleted successfully");
      setProductToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete product");
    }
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

  return (
    <>
      {/* Top Header & Breadcrumb */}
      <div style={{ marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => navigate("/stores")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "transparent",
            border: "none",
            color: "#4f46e5",
            fontSize: "13.5px",
            fontWeight: 600,
            cursor: "pointer",
            padding: "4px 0",
            marginBottom: "12px",
          }}
        >
          <ArrowLeft size={16} /> Back to Stores
        </button>

        {/* Store Profile Card */}
        <div
          className="card"
          style={{
            padding: "20px 24px",
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#4f46e5",
                  flexShrink: 0,
                }}
              >
                <Store size={26} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#111827" }}>
                    {store?.name || (isStoreLoading ? "Loading store..." : "Store Products")}
                  </h1>
                  {store && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: store.is_open ? "#f0fdf4" : "#fef2f2",
                        color: store.is_open ? "#166534" : "#991b1b",
                        border: store.is_open ? "1px solid #bbf7d0" : "1px solid #fecaca",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: store.is_open ? "#16a34a" : "#dc2626",
                        }}
                      />
                      {store.is_open ? "OPEN" : "CLOSED"}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    marginTop: "6px",
                    fontSize: "12.5px",
                    color: "#64748b",
                    flexWrap: "wrap",
                  }}
                >
                  {store?.city && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={13} /> {store.city}
                      {store.state ? `, ${store.state}` : ""}
                    </span>
                  )}
                  {store?.owner_name && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <User size={13} /> {store.owner_name}
                    </span>
                  )}
                  {store?.phone && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Phone size={13} /> {store.phone}
                    </span>
                  )}
                  {store?.email && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Mail size={13} /> {store.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button onClick={() => navigate(`/products/create?storeId=${storeId}`)}>
              <Plus size={18} /> Add product
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #4f46e5" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#4f46e5" }}>Total Store Products</span>
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
      </div>

      {/* Main Table Card */}
      <div className="card table-card">
        <div className="table-toolbar">
          <SearchInput
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder="Search products in this store..."
          />
          <div className="table-actions">
            <Button
              variant="outline"
              onClick={() => {
                setPendingFilters(filters);
                setFiltersOpen((prev) => !prev);
              }}
            >
              <Filter size={16} /> Filters
            </Button>
          </div>
        </div>

        {filtersOpen && (
          <div className="filters-panel">
            <div className="filter-item">
              <label htmlFor="category-filter">Category</label>
              <Select
                id="category-filter"
                value={pendingFilters.categoryId}
                onChange={(e) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
              >
                <option value="">All Categories</option>
                {(categoryResponse?.data || []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="filter-item">
              <label htmlFor="status-filter">Status</label>
              <Select
                id="status-filter"
                value={pendingFilters.isActive}
                onChange={(e) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    isActive: e.target.value,
                  }))
                }
              >
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>

            <div className="filter-item">
              <label htmlFor="availability-type-filter">Availability</label>
              <Select
                id="availability-type-filter"
                value={pendingFilters.availabilityType}
                onChange={(e) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    availabilityType: e.target.value,
                  }))
                }
              >
                <option value="">All</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="MADE_TO_ORDER">Made to Order</option>
              </Select>
            </div>

            <div className="filters-actions">
              <Button variant="outline" onClick={clearFilters}>
                <X size={16} /> Clear
              </Button>
              <Button onClick={applyFilters}>Apply</Button>
            </div>
          </div>
        )}

        <BulkActionBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          actions={[
            {
              label: "Set Active",
              icon: <CheckCircle size={14} />,
              onClick: () => handleBulkStatusChange(true),
              disabled: isBulkUpdating,
            },
            {
              label: "Set Inactive",
              icon: <Ban size={14} />,
              onClick: () => handleBulkStatusChange(false),
              disabled: isBulkUpdating,
            },
            {
              label: "Delete",
              icon: <Trash2 size={14} />,
              variant: "danger",
              onClick: () => setBulkDeleteConfirmOpen(true),
              disabled: isBulkDeleting,
            },
          ]}
        />

        <DataTable
          selectable
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          loading={isProductsLoading}
          error={productsError?.data?.message || (productsError ? "Failed to load products" : null)}
          columns={[
            {
              key: "id",
              label: "ID",
              sortable: true,
              render: (id) => <span style={{ fontWeight: 600, color: "#64748b" }}>#{id}</span>,
            },
            {
              key: "name",
              label: "PRODUCT",
              sortable: true,
              render: (_, product) => (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {Array.isArray(product.images) && product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "8px",
                        objectFit: "cover",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "8px",
                        background: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#94a3b8",
                      }}
                    >
                      <Package size={18} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#111827" }}>
                      {product.name}
                    </div>
                    {product.description && (
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "#6b7280",
                          maxWidth: "240px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {product.description}
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: "category_name",
              label: "CATEGORY",
              sortable: true,
              render: (cat) => (
                <span
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  {cat || "—"}
                </span>
              ),
            },
            {
              key: "price",
              label: "PRICE",
              sortable: true,
              render: (price) => (
                <span style={{ fontWeight: 700, color: "#111827", fontSize: "13.5px" }}>
                  ₹{Number(price || 0).toLocaleString("en-IN")}
                </span>
              ),
            },
            {
              key: "stock",
              label: "STOCK",
              sortable: true,
              render: (_, product) =>
                product.availability_type === "MADE_TO_ORDER" ? (
                  <span
                    style={{
                      background: "#fdf4ff",
                      color: "#9333ea",
                      border: "1px solid #f0abfc",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    Made to Order
                  </span>
                ) : Number(product.stock) <= 0 ? (
                  <span
                    style={{
                      background: "#fef2f2",
                      color: "#b91c1c",
                      border: "1px solid #fecaca",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    Out of Stock
                  </span>
                ) : (
                  <span
                    style={{
                      background: "#f0fdf4",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {product.stock} in stock
                  </span>
                ),
            },
            {
              key: "is_active",
              label: "STATUS",
              sortable: true,
              render: (isActive) => (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: isActive ? "#f0fdf4" : "#f1f5f9",
                    color: isActive ? "#15803d" : "#64748b",
                    border: isActive ? "1px solid #bbf7d0" : "1px solid #cbd5e1",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: isActive ? "#16a34a" : "#94a3b8",
                    }}
                  />
                  {isActive ? "Active" : "Inactive"}
                </span>
              ),
            },
          ]}
          data={rows}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          emptyMessage="No products found for this store. Click 'Add Product' to create one."
          renderActions={(product) => (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Button
                variant="edit"
                title={`Edit ${product.name}`}
                aria-label={`Edit ${product.name}`}
                onClick={() => navigate(`/products/${product.id}/edit`)}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="delete"
                title={`Delete ${product.name}`}
                aria-label={`Delete ${product.name}`}
                onClick={() => setProductToDelete(product)}
                style={{ padding: "5px 8px" }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        />

        <Pagination
          page={page}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.totalItems || rows.length}
          limit={limit}
          onPageChange={setPage}
        />
      </div>

      {/* Delete Single Product Dialog */}
      <ConfirmDialog
        isOpen={Boolean(productToDelete)}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}" from this store? This action cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteSingle}
        onCancel={() => setProductToDelete(null)}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirmOpen}
        title="Delete Selected Products"
        message={`Are you sure you want to delete ${selectedIds.length} selected product(s)? This action cannot be undone.`}
        confirmText="Delete Products"
        cancelText="Cancel"
        variant="danger"
        isLoading={isBulkDeleting}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
    </>
  );
}

