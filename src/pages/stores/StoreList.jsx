import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Store,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Check,
  X,
  Package,
  ShoppingBag,
} from "lucide-react";
import {
  useGetStoresQuery,
  useUpdateStoreMutation,
  useToggleStoreStatusMutation,
  useToggleStoreAutoForwardMutation,
  useDeleteStoreMutation,
} from "../../services/storeApi";
import DataTable from "../../components/common/DataTable";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Pagination from "../../components/ui/Pagination";
import CreateStoreModal from "../../modals/CreateStoreModal";
import EditStoreModal from "../../modals/EditStoreModal";

const EMPTY_STORES = [];

// Modern Toggle Switch with icon inside sliding thumb
function PermissionToggle({
  isActive,
  isPending = false,
  onClick,
  disabled = false,
  title = "",
}) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(isActive)}
        onClick={onClick}
        disabled={disabled}
        title={title}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          width: "44px",
          height: "24px",
          borderRadius: "9999px",
          background: isPending ? "#cbd5e1" : isActive ? "#16a34a" : "#dc2626",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          padding: "2px",
          transition: "background 0.2s ease",
          opacity: disabled ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            transform: isActive ? "translateX(20px)" : "translateX(0px)",
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            color: isPending ? "#64748b" : isActive ? "#16a34a" : "#dc2626",
          }}
        >
          {isActive ? (
            <Check size={12} strokeWidth={3.5} />
          ) : (
            <X size={12} strokeWidth={3.5} />
          )}
        </span>
      </button>

      <span
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: isPending ? "#64748b" : isActive ? "#15803d" : "#b91c1c",
          userSelect: "none",
        }}
      >
        {isPending ? "Pending (Click to Allow)" : isActive ? "Allowed" : "Denied"}
      </span>
    </div>
  );
}

export default function StoreList() {
  const navigate = useNavigate();

  // Stores State
  const [storeSearch, setStoreSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storesPage, setStoresPage] = useState(1);
  const storesLimit = 10;

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [storeToDelete, setStoreToDelete] = useState(null);

  // Queries
  const {
    data: storesData,
    isLoading: isStoresLoading,
    refetch: refetchStores,
    isFetching: isStoresFetching,
  } = useGetStoresQuery({
    search: storeSearch.trim(),
    is_open: statusFilter === "open" ? true : statusFilter === "closed" ? false : undefined,
    page: storesPage,
    limit: storesLimit,
  });

  // Mutations
  const [updateStore] = useUpdateStoreMutation();
  const [toggleStatus] = useToggleStoreStatusMutation();
  const [toggleAutoForward] = useToggleStoreAutoForwardMutation();
  const [deleteStore, { isLoading: isDeleting }] = useDeleteStoreMutation();

  const [togglingOpenId, setTogglingOpenId] = useState(null);
  const [togglingAccessId, setTogglingAccessId] = useState(null);
  const [togglingAutoForwardId, setTogglingAutoForwardId] = useState(null);

  const stores = storesData?.stores || EMPTY_STORES;
  const storesPagination = storesData?.pagination;

  // Counts for metric cards
  const openStoresCount =
    storesData?.summary?.open ?? stores.filter((s) => s.is_open).length;
  const closedStoresCount =
    storesData?.summary?.closed ?? (stores.length - openStoresCount);

  // Toggle Branch Open/Closed Status
  const handleToggleOpen = async (store) => {
    try {
      setTogglingOpenId(store.id);
      const res = await toggleStatus({
        id: store.id,
        is_open: !store.is_open,
      }).unwrap();
      toast.success(res?.message || "Store status updated");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update store status");
    } finally {
      setTogglingOpenId(null);
    }
  };

  // Toggle Store Access Permission (Allowed vs Denied)
  const handleToggleStoreAccess = async (store) => {
    try {
      setTogglingAccessId(store.id);
      const newAccessState = !store.is_active;
      await updateStore({
        id: store.id,
        is_active: newAccessState,
      }).unwrap();

      toast.success(
        newAccessState
          ? `Access Allowed for "${store.name}".`
          : `Access Denied for "${store.name}".`
      );
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update access permission");
    } finally {
      setTogglingAccessId(null);
    }
  };

  // Toggle Auto-Forward Orders Directly (Skip Admin Approval)
  const handleToggleAutoForward = async (store) => {
    try {
      setTogglingAutoForwardId(store.id);
      const newAutoForward = !store.auto_forward_orders;
      const res = await toggleAutoForward({
        id: store.id,
        auto_forward_orders: newAutoForward,
      }).unwrap();

      toast.success(
        res?.message ||
          (newAutoForward
            ? `Direct Order Dispatch enabled for "${store.name}". Orders will bypass Admin review.`
            : `Admin Review enabled for "${store.name}". Orders will wait for manual dispatch.`)
      );
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update order routing setting");
    } finally {
      setTogglingAutoForwardId(null);
    }
  };


  const confirmDelete = async () => {
    if (!storeToDelete) return;
    try {
      await deleteStore(storeToDelete.id).unwrap();
      toast.success("Store deleted successfully");
      setStoreToDelete(null);
    } catch {
      // Handled by ConfirmDialog error prop
    }
  };

  return (
    <>
      {/* 1. Page Header */}
      <div className="section-head">
        <div>
          <h1>Stores &amp; Branch Owners</h1>
          <p>
            Manage bakery branch locations, toggle store open status, and track operations.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Add Store Owner Button */}
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus size={18} /> Add Store Owner
          </Button>
        </div>
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
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#6253e8" }}>
            Total Registered Stores
          </span>
          <div
            style={{ fontSize: "24px", fontWeight: 800, color: "#111827", marginTop: "4px" }}
          >
            {storesData?.summary?.total ?? storesPagination?.total ?? stores.length}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #16a34a" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>
            Open Branches
          </span>
          <div
            style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}
          >
            {openStoresCount}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #dc2626" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626" }}>
            Closed Branches
          </span>
          <div
            style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626", marginTop: "4px" }}
          >
            {closedStoresCount}
          </div>
        </div>
      </div>

          {/* Table Card with Toolbar */}
          <div className="card table-card">
            <div className="table-toolbar">
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <SearchInput
                  value={storeSearch}
                  onChange={(e) => {
                    setStoreSearch(e.target.value);
                    setStoresPage(1);
                  }}
                  autoComplete="off"
                  name="admin_store_search"
                  placeholder="Search store name, city, owner, email..."
                />
                {storeSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setStoreSearch("");
                      setStoresPage(1);
                    }}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      color: "#9ca3af",
                    }}
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setStoresPage(1);
                  }}
                  style={{ minWidth: "150px" }}
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open Branches</option>
                  <option value="closed">Closed Branches</option>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => refetchStores()}
                  disabled={isStoresFetching}
                  title="Refresh store listings"
                >
                  <RefreshCw size={16} className={isStoresFetching ? "spin" : ""} /> Refresh
                </Button>
              </div>
            </div>

            {/* Core DataTable Component */}
            <DataTable
              loading={isStoresLoading}
              columns={[
                {
                  key: "name",
                  label: "STORE / BRANCH",
                  render: (_, store) => (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#111827" }}>
                        {store.name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginTop: "3px",
                          color: "#6b7280",
                          fontSize: "11.5px",
                        }}
                      >
                        {store.city && (
                          <span
                            style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}
                          >
                            <MapPin size={12} /> {store.city}, {store.state || "RJ"}
                          </span>
                        )}
                        {store.phone && (
                          <span
                            style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}
                          >
                            <Phone size={11} /> {store.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "owner",
                  label: "STORE OWNER",
                  render: (_, store) => (
                    <div>
                      <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "13px" }}>
                        {store.owner_name || "Unassigned"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "#6b7280",
                          fontSize: "11.5px",
                          marginTop: "2px",
                        }}
                      >
                        <Mail size={11} /> {store.owner_email || store.email}
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        {store.owner_is_active ? (
                          <span
                            style={{
                              color: "#16a34a",
                              fontSize: "11px",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <CheckCircle2 size={12} /> Active &amp; Password Set
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "#d97706",
                              fontSize: "11px",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <Clock size={12} /> Invited (Password Pending)
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "orders_summary",
                  label: "ORDERS & REVENUE",
                  render: (_, store) => (
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontWeight: 700,
                          fontSize: "13px",
                          color: "#111827",
                        }}
                      >
                        <ShoppingBag size={13} style={{ color: "#059669" }} />
                        {Number(store.total_orders || 0)} {Number(store.total_orders || 0) === 1 ? "order" : "orders"}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#059669",
                          marginTop: "2px",
                        }}
                      >
                        ₹{Number(store.total_revenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "assigned_categories",
                  label: "PERMITTED CATEGORIES",
                  render: (cats) => (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "5px",
                        maxWidth: "280px",
                      }}
                    >
                      {Array.isArray(cats) && cats.length > 0 ? (
                        cats.map((c) => (
                          <span
                            key={c.id}
                            style={{
                              background: "#f0fdf4",
                              color: "#166534",
                              border: "1px solid #bbf7d0",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            {c.name}
                          </span>
                        ))
                      ) : (
                        <span className="muted" style={{ fontSize: "11px" }}>
                          No categories assigned
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "delivery_radius",
                  label: "DELIVERY RADIUS",
                  render: (_, store) => (
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontWeight: 700,
                          fontSize: "12px",
                          color: "#166534",
                          background: "#f0fdf4",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <MapPin size={12} />
                        {Number(store.max_delivery_distance || 10)} km radius
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: store.latitude != null ? "#6b7280" : "#d97706",
                          marginTop: "3px",
                          fontWeight: 500,
                        }}
                      >
                        {store.latitude != null
                          ? `${Number(store.latitude).toFixed(3)}, ${Number(store.longitude).toFixed(3)}`
                          : "⚠️ Location not set"}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "is_open",
                  label: "BRANCH STATUS",
                  render: (isOpen, store) => (
                    <button
                      type="button"
                      onClick={() => handleToggleOpen(store)}
                      disabled={togglingOpenId === store.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 12px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 800,
                        cursor: "pointer",
                        border: isOpen ? "1px solid #bbf7d0" : "1px solid #fecaca",
                        background: isOpen ? "#f0fdf4" : "#fef2f2",
                        color: isOpen ? "#15803d" : "#b91c1c",
                        transition: "all 0.15s ease",
                      }}
                      title={isOpen ? "Click to set store closed" : "Click to set store open"}
                    >
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: isOpen ? "#16a34a" : "#dc2626",
                        }}
                      />
                      {togglingOpenId === store.id ? "Updating..." : isOpen ? "OPEN" : "CLOSED"}
                    </button>
                  ),
                },
                {
                  key: "is_active",
                  label: "ACCESS PERMISSION",
                  render: (isActive, store) => {
                    const hasAccess = isActive ?? true;
                    return (
                      <PermissionToggle
                        isActive={hasAccess}
                        onClick={() => handleToggleStoreAccess(store)}
                        disabled={togglingAccessId === store.id}
                        title={hasAccess ? "Click to Deny Store Access" : "Click to Allow Store Access"}
                      />
                    );
                  },
                },
                {
                  key: "auto_forward_orders",
                  label: "DIRECT ORDER DISPATCH",
                  render: (autoForward, store) => {
                    const isDirect = Boolean(autoForward);
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <PermissionToggle
                          isActive={isDirect}
                          onClick={() => handleToggleAutoForward(store)}
                          disabled={togglingAutoForwardId === store.id}
                          title={
                            isDirect
                              ? "Auto-Forward Active: Orders sent straight to Store Owner without Admin review. Click to require Admin approval."
                              : "Admin Review Required: Orders wait for Admin to forward to Store Owner. Click to enable Direct Dispatch."
                          }
                        />
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: isDirect ? "#0369a1" : "#64748b",
                          }}
                        >
                          {togglingAutoForwardId === store.id
                            ? "Updating..."
                            : isDirect
                            ? "Direct to Store"
                            : "Requires Admin"}
                        </span>
                      </div>
                    );
                  },
                },
              ]}
              data={stores}
              emptyMessage="No stores found. Click 'Add Store Owner' to register your first branch."
              renderActions={(store) => (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {/* View Store Products */}
                  <Button
                    variant="outline"
                    title={`View products for ${store.name}`}
                    aria-label={`View products for ${store.name}`}
                    onClick={() => navigate(`/stores/${store.id}/products`)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 11px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#4338ca",
                      borderColor: "#c7d2fe",
                      background: "#eef2ff",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Package size={14} />
                    Products
                  </Button>

                  {/* View Store Orders */}
                  <Button
                    variant="outline"
                    title={`View orders for ${store.name}`}
                    aria-label={`View orders for ${store.name}`}
                    onClick={() => navigate(`/stores/${store.id}/orders`)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 11px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#059669",
                      borderColor: "#a7f3d0",
                      background: "#ecfdf5",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <ShoppingBag size={14} />
                    Orders
                  </Button>

                  {/* Edit Store (includes category assignment) */}
                  <Button
                    variant="edit"
                    title={`Edit ${store.name}`}
                    aria-label={`Edit ${store.name}`}
                    onClick={() => setEditingStore(store)}
                  >
                    <Pencil size={14} />
                  </Button>

                  {/* Delete Store */}
                  <Button
                    variant="delete"
                    title={`Delete ${store.name}`}
                    aria-label={`Delete ${store.name}`}
                    onClick={() => setStoreToDelete(store)}
                    style={{ padding: "5px 8px" }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            />

            {/* Stores Pagination */}
            <Pagination
              page={storesPage}
              totalPages={storesPagination?.totalPages || 1}
              total={storesPagination?.total || stores.length}
              limit={storesLimit}
              onPageChange={(p) => setStoresPage(p)}
              itemLabel="stores"
            />
          </div>

      <CreateStoreModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setStoreSearch("");
          setStatusFilter("all");
          setStoresPage(1);
          refetchStores();
        }}
      />

      <EditStoreModal
        isOpen={Boolean(editingStore)}
        store={editingStore}
        onClose={() => setEditingStore(null)}
      />

      {/* Confirm Delete Store Dialog */}
      {storeToDelete && (
        <ConfirmDialog
          isOpen={Boolean(storeToDelete)}
          title="Delete Store?"
          message={`Are you sure you want to delete "${storeToDelete.name}"? All associated products and owner permissions will be permanently removed.`}
          confirmLabel="Delete Store"
          danger={true}
          isLoading={isDeleting}
          onConfirm={confirmDelete}
          onClose={() => setStoreToDelete(null)}
        />
      )}
    </>
  );
}
