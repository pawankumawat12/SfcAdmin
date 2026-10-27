import React, { useState, useEffect } from "react";
import {
  useGetCustomersQuery,
  useEditCustomerMutation,
  useDeleteCustomerMutation,
  useToggleCustomerStatusMutation,
  useBulkUpdateCustomerStatusMutation,
  useBulkDeleteCustomersMutation,
  useGetBlockedSupportRequestsQuery,
  useResolveBlockedSupportRequestMutation,
} from "../../services/authApi";
import {
  LoaderCircle,
  Users,
  ShieldAlert,
  Edit2,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  MessageSquare,
  Search,
  Check,
  X,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAdminSocket } from "../../services/socket";
import useDebouncedValue from "../../utils/useDebouncedValue";
import Pagination from "../../components/ui/Pagination";
import { isValidIndianPhone, sanitizePhoneInput } from "../../utils/phoneValidation";
import DataTable from "../../components/common/DataTable";
import BulkActionBar from "../../components/common/BulkActionBar";
import Button from "../../components/ui/Button";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { exportToCsv } from "../../utils/csvExport";

export default function CustomerList() {
  const user = useSelector((state) => state.auth.user);
  if (user?.role === "store_owner") {
    return <Navigate to="/" replace />;
  }

  const [activeTab, setActiveTab] = useState("customers"); // "customers" | "requests"
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchTerm, 600);

  const {
    data: customersData,
    isLoading: loadingCustomers,
    isError: errorCustomers,
    refetch: refetchCustomers,
  } = useGetCustomersQuery(
    {
      page,
      limit: 10,
      search: debouncedSearch.trim() || undefined,
    },
    { refetchOnFocus: true }
  );

  const {
    data: requestsData,
    isLoading: loadingRequests,
    refetch: refetchRequests,
  } = useGetBlockedSupportRequestsQuery(
    { page: requestPage, limit: 10 },
    { refetchOnFocus: true }
  );

  const [editCustomer, { isLoading: isEditing }] = useEditCustomerMutation();
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();
  const [toggleCustomerStatus, { isLoading: isToggling }] =
    useToggleCustomerStatusMutation();
  const [resolveBlockedRequest, { isLoading: isResolving }] =
    useResolveBlockedSupportRequestMutation();
  const [bulkUpdateStatus, { isLoading: isBulkUpdating }] =
    useBulkUpdateCustomerStatusMutation();
  const [bulkDeleteCustomers, { isLoading: isBulkDeleting }] =
    useBulkDeleteCustomersMutation();

  // Selection & Bulk State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBlockModalOpen, setBulkBlockModalOpen] = useState(false);
  const [bulkBlockReason, setBulkBlockReason] = useState("");
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });

  // Block Modal State
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Socket.IO for real-time customer status and incoming unblock requests
  useEffect(() => {
    const socket = getAdminSocket();

    const handleNewRequest = (data) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-1">
            <b>New Unblock Request</b>
            <span className="text-xs">
              {data.name} ({data.email}): {data.message}
            </span>
          </div>
        ),
        { duration: 6000 }
      );
      refetchRequests();
    };

    const handleStatusUpdate = () => {
      refetchCustomers();
    };

    socket.on("new_blocked_support_request", handleNewRequest);
    socket.on("admin_customer_status_updated", handleStatusUpdate);

    return () => {
      socket.off("new_blocked_support_request", handleNewRequest);
      socket.off("admin_customer_status_updated", handleStatusUpdate);
    };
  }, [refetchCustomers, refetchRequests]);

  const rawCustomers = customersData?.data || (Array.isArray(customersData) ? customersData : []);
  const customerPagination = customersData?.pagination;
  const rawRequests = requestsData?.data || (Array.isArray(requestsData) ? requestsData : []);
  const requestPagination = requestsData?.pagination;
  const pendingRequests = rawRequests.filter((r) => r.status === "pending");

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer);
    setEditForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (editForm.phone && editForm.phone.trim() && !isValidIndianPhone(editForm.phone)) {
      toast.error("Please enter a valid 10-digit phone number starting with 6, 7, 8, or 9.");
      return;
    }

    try {
      await editCustomer({
        id: selectedCustomer.id,
        ...editForm,
      }).unwrap();
      toast.success("Customer details updated successfully!");
      setEditModalOpen(false);
      setSelectedCustomer(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update customer.");
    }
  };

  const handleOpenBlockModal = (customer) => {
    setSelectedCustomer(customer);
    setBlockReason(
      customer.is_blocked ? "" : "Account deactivated by administrator."
    );
    setBlockModalOpen(true);
  };

  const handleConfirmToggleBlock = async () => {
    if (!selectedCustomer) return;
    const isCurrentlyBlocked = Boolean(selectedCustomer.is_blocked);
    try {
      await toggleCustomerStatus({
        id: selectedCustomer.id,
        is_blocked: !isCurrentlyBlocked,
        is_active: isCurrentlyBlocked, // if currently blocked, activate it
        block_reason: !isCurrentlyBlocked ? blockReason : null,
      }).unwrap();

      toast.success(
        isCurrentlyBlocked
          ? "Customer unblocked and activated!"
          : "Customer blocked successfully."
      );
      setBlockModalOpen(false);
      setSelectedCustomer(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update customer status.");
    }
  };

  const handleOpenDeleteModal = (customer) => {
    setSelectedCustomer(customer);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    try {
      await deleteCustomer(selectedCustomer.id).unwrap();
      toast.success("Customer removed successfully.");
      setDeleteModalOpen(false);
      setSelectedCustomer(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete customer.");
    }
  };

  const handleResolveRequest = async (requestId, status) => {
    try {
      await resolveBlockedRequest({
        id: requestId,
        status,
        admin_response:
          status === "approved"
            ? "Your request was approved and your account is active."
            : "Your request to unblock was denied by administrator.",
      }).unwrap();

      toast.success(
        status === "approved"
          ? "Request approved & customer unblocked!"
          : "Request rejected."
      );
      refetchCustomers();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to resolve request.");
    }
  };

  const customerExportColumns = [
    { key: "id", label: "Customer ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "orders_count", label: "Orders Count" },
    { key: "total_spent", label: "Total Spent (₹)" },
    {
      key: "is_blocked",
      label: "Account Status",
      getValue: (c) => (c.is_blocked ? `Blocked (${c.block_reason || "Admin"})` : "Active"),
    },
    {
      key: "created_at",
      label: "Joined At",
      getValue: (c) => (c.created_at ? new Date(c.created_at).toLocaleString() : ""),
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

  const handleBulkUnblock = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkUpdateStatus({
        ids: selectedIds,
        isBlocked: false,
      }).unwrap();
      toast.success(res.message || `Unblocked ${selectedIds.length} customer(s)`);
      setSelectedIds([]);
      refetchCustomers();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to unblock customers");
    }
  };

  const handleBulkBlockSubmit = async (e) => {
    e?.preventDefault();
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkUpdateStatus({
        ids: selectedIds,
        isBlocked: true,
        blockReason: bulkBlockReason.trim() || "Account blocked by administrator.",
      }).unwrap();
      toast.success(res.message || `Blocked ${selectedIds.length} customer(s)`);
      setSelectedIds([]);
      setBulkBlockModalOpen(false);
      setBulkBlockReason("");
      refetchCustomers();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to block customers");
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkDeleteCustomers({ ids: selectedIds }).unwrap();
      toast.success(res.message || `Deleted ${selectedIds.length} customer(s)`);
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
      refetchCustomers();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete customers");
    }
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedRows = rawCustomers.filter((c) => selectedIds.includes(c.id));
    exportToCsv({
      filename: `customers-selected-${new Date().toISOString().slice(0, 10)}`,
      columns: customerExportColumns,
      data: selectedRows,
    });
    toast.success(`Exported ${selectedRows.length} selected customer(s) to CSV`);
  };

  const handleExportAll = () => {
    exportToCsv({
      filename: `customers-export-${new Date().toISOString().slice(0, 10)}`,
      columns: customerExportColumns,
      data: rawCustomers,
    });
    toast.success(`Exported ${rawCustomers.length} customer(s) to CSV`);
  };

  const customerColumns = [
    {
      key: "name",
      label: "Customer",
      render: (_, c) => (
        <div style={{ maxWidth: "200px" }}>
          <div
            style={{
              fontWeight: 600,
              color: "#111827",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={c.name || "Customer"}
          >
            {c.name || "Customer"}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            ID: #{c.id}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Contact",
      render: (_, c) => (
        <div style={{ maxWidth: "220px" }}>
          <div
            style={{
              color: "#374151",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={c.email || ""}
          >
            {c.email || "-"}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            {c.phone || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "orders_count",
      label: "Orders",
      render: (val) => (
        <span
          style={{
            background: "#f3f4f6",
            padding: "3px 8px",
            borderRadius: "6px",
            fontWeight: 600,
          }}
        >
          {Number(val || 0)}
        </span>
      ),
    },
    {
      key: "total_spent",
      label: "Total Spent",
      render: (val) => (
        <span
          style={{
            fontWeight: 600,
            color: "#059669",
          }}
        >
          ₹{Number(val || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "is_blocked",
      label: "Status",
      render: (isBlocked) =>
        Boolean(isBlocked) ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "#fee2e2",
              color: "#dc2626",
              padding: "3px 8px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <Ban size={12} /> Blocked
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "#d1fae5",
              color: "#059669",
              padding: "3px 8px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <CheckCircle size={12} /> Active
          </span>
        ),
    },
    {
      key: "created_at",
      label: "Joined",
      render: (val) => (
        <span style={{ fontSize: "12px", color: "#6b7280", whiteSpace: "nowrap" }}>
          {new Date(val).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  const renderCustomerActions = (c) => {
    const isBlocked = Boolean(c.is_blocked);
    return (
      <div style={{ display: "inline-flex", gap: "6px", justifyContent: "flex-end" }}>
        {/* EDIT */}
        <button
          type="button"
          title="Edit Customer"
          className="action-btn action-btn-edit"
          onClick={() => handleOpenEdit(c)}
          style={{
            padding: "6px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            background: "#fff",
            color: "#374151",
            cursor: "pointer",
          }}
        >
          <Edit2 size={15} />
        </button>

        {/* BLOCK / UNBLOCK */}
        <button
          type="button"
          title={isBlocked ? "Unblock Account" : "Block Account"}
          onClick={() => handleOpenBlockModal(c)}
          className="action-btn"
          style={{
            padding: "6px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            background: isBlocked ? "#10b981" : "#ef4444",
            color: "#fff",
            cursor: "pointer",
            background: isBlocked ? "#dcfce7" : "#fef2f2",
            borderColor: isBlocked ? "#86efac" : "#fecaca",
            color: isBlocked ? "#166534" : "#dc2626",
          }}
        >
          {isBlocked ? (
            <CheckCircle size={15} />
          ) : (
            <Ban size={15} />
          )}
        </button>

        {/* DELETE */}
        <button
          type="button"
          title="Delete Customer"
          className="action-btn action-btn-delete"
          onClick={() => handleOpenDeleteModal(c)}
          style={{
            padding: "6px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            background: "#fff",
            color: "#dc2626",
            cursor: "pointer",
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Customer Management</h1>
          <p>
            Manage registered customers, account activation, block permissions,
            and unblock requests.
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "8px" }}>
         <button
            type="button"
            onClick={() => setActiveTab("requests")}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "14px",
              border: "1px solid #e5e7eb",
              background: activeTab === "requests" ? "#ef4444" : "#fff",
              color: activeTab === "requests" ? "#fff" : "#374151",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              position: "relative",
            }}
          >
            <ShieldAlert size={16} />
            <span>Unblock Requests</span>
            {pendingRequests.length > 0 && (
              <span
                style={{
                  background: activeTab === "requests" ? "#fff" : "#ef4444",
                  color: activeTab === "requests" ? "#ef4444" : "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "9999px",
                }}
              >
                {pendingRequests.length}
              </span>
            )}
          </button>
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
        <div
          className="card"
          onClick={() => setActiveTab("customers")}
          style={{ padding: "16px 20px", borderLeft: "4px solid #6253e8", cursor: "pointer" }}
        >
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#6253e8" }}>Total Customers</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827", marginTop: "4px" }}>
            {customersData?.summary?.total ?? customerPagination?.totalItems ?? rawCustomers.length}
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px", borderLeft: "4px solid #16a34a" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>Active Accounts</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>
            {customersData?.summary?.active ?? rawCustomers.filter((c) => c.is_active && !c.is_blocked).length}
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px", borderLeft: "4px solid #dc2626" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626" }}>Blocked Customers</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626", marginTop: "4px" }}>
            {customersData?.summary?.blocked ?? rawCustomers.filter((c) => c.is_blocked).length}
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveTab("requests")}
          style={{
            padding: "16px 20px",
            borderLeft: "4px solid #d97706",
            cursor: "pointer",
            transition: "box-shadow 0.2s ease",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#d97706" }}>Pending Unblock Requests</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#d97706", marginTop: "4px" }}>
            {pendingRequests.length}
          </div>
        </div>
      </div>

      {/* TAB 1: CUSTOMERS DIRECTORY */}
      {activeTab === "customers" && (
        <div style={{ marginTop: "16px" }}>
          {/* Toolbar: Search and Export */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "8px 14px",
                maxWidth: "400px",
                flex: 1,
              }}
            >
              <Search size={18} color="#9ca3af" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "14px",
                  width: "100%",
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleExportAll}
              title="Export all visible customers as CSV"
            >
              <Download size={16} /> Export Customers (CSV)
            </Button>
          </div>

          {errorCustomers ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#dc2626",
              }}
            >
              Failed to load customers list.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {selectedIds.length > 0 && (
                <BulkActionBar
                  selectedCount={selectedIds.length}
                  onClearSelection={() => setSelectedIds([])}
                  itemLabel="customers"
                >
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBulkBlockReason("");
                      setBulkBlockModalOpen(true);
                    }}
                    disabled={isBulkUpdating}
                    style={{ fontSize: "13px", padding: "5px 10px" }}
                  >
                    <Ban size={14} color="#dc2626" /> Block Selected
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBulkUnblock}
                    disabled={isBulkUpdating}
                    style={{ fontSize: "13px", padding: "5px 10px" }}
                  >
                    <CheckCircle size={14} color="#16a34a" /> Unblock Selected
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
                loading={loadingCustomers}
                selectable={true}
                selectedIds={selectedIds}
                onSelectAll={handleSelectAll}
                onSelectRow={handleSelectRow}
                data={rawCustomers}
                columns={customerColumns}
                renderActions={renderCustomerActions}
                emptyMessage="No customers found."
              />
              <Pagination
                page={customerPagination?.page || page}
                totalPages={customerPagination?.totalPages || 1}
                total={customerPagination?.total || rawCustomers.length}
                limit={10}
                onPageChange={(p) => setPage(p)}
                itemLabel="customers"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UNBLOCK SUPPORT REQUESTS */}
      {activeTab === "requests" && (
        <div style={{ marginTop: "16px" }}>
          {loadingRequests ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px",
                color: "#6b7280",
                gap: "8px",
              }}
            >
              <LoaderCircle size={20} className="animate-spin" />
              <span>Loading unblock requests...</span>
            </div>
          ) : rawRequests.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                padding: "48px",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              <ShieldAlert
                size={36}
                style={{ margin: "0 auto 8px auto", color: "#10b981" }}
              />
              <p style={{ fontWeight: 600, fontSize: "16px", color: "#111827" }}>
                No Unblock Requests
              </p>
              <p style={{ fontSize: "13px" }}>
                No blocked customers have submitted support requests.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {rawRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      background: "#fff",
                      borderRadius: "14px",
                      border: "1px solid #e5e7eb",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <h4
                            style={{
                              margin: 0,
                              fontWeight: 700,
                              color: "#111827",
                              fontSize: "15px",
                            }}
                          >
                            {req.name}
                          </h4>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              background:
                                req.status === "pending"
                                  ? "#fef3c7"
                                  : req.status === "approved"
                                  ? "#d1fae5"
                                  : "#fee2e2",
                              color:
                                req.status === "pending"
                                  ? "#b45309"
                                  : req.status === "approved"
                                  ? "#065f46"
                                  : "#b91c1c",
                              textTransform: "uppercase",
                            }}
                          >
                            {req.status}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: "2px 0 0 0",
                            fontSize: "12px",
                            color: "#6b7280",
                          }}
                        >
                          Email: <b>{req.email}</b> • Phone:{" "}
                          <b>{req.phone || "N/A"}</b> • Received:{" "}
                          {new Date(req.created_at).toLocaleString("en-IN")}
                        </p>
                      </div>

                      {req.status === "pending" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() =>
                              handleResolveRequest(req.id, "approved")
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "none",
                              background: "#10b981",
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: "12.5px",
                              cursor: "pointer",
                            }}
                          >
                            <Check size={14} /> Approve & Unblock
                          </button>
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() =>
                              handleResolveRequest(req.id, "rejected")
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              background: "#fff",
                              color: "#ef4444",
                              fontWeight: 600,
                              fontSize: "12.5px",
                              cursor: "pointer",
                            }}
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        background: "#f9fafb",
                        borderRadius: "10px",
                        padding: "12px",
                        fontSize: "13.5px",
                        color: "#374151",
                        lineHeight: "1.5",
                        borderLeft: "4px solid #3b82f6",
                      }}
                    >
                      <b>Customer's Message:</b> {req.message}
                    </div>

                    {req.admin_response && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          fontStyle: "italic",
                        }}
                      >
                        Admin Decision Note: {req.admin_response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Pagination
                page={requestPagination?.page || requestPage}
                totalPages={requestPagination?.totalPages || 1}
                total={requestPagination?.total || rawRequests.length}
                limit={10}
                onPageChange={(p) => setRequestPage(p)}
                itemLabel="support requests"
              />
            </>
          )}
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "460px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: "18px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Edit Customer Details
            </h3>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: sanitizePhoneInput(e.target.value) })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setSelectedCustomer(null);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    color: "#374151",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#3b82f6",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isEditing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOCK / UNBLOCK CONFIRM MODAL */}
      {blockModalOpen && selectedCustomer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "440px",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              {selectedCustomer.is_blocked ? (
                <CheckCircle size={24} color="#10b981" />
              ) : (
                <Ban size={24} color="#ef4444" />
              )}
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {selectedCustomer.is_blocked
                  ? "Unblock Customer Account?"
                  : "Block Customer Account?"}
              </h3>
            </div>

            <p style={{ fontSize: "14px", color: "#4b5563", margin: "0 0 16px 0" }}>
              {selectedCustomer.is_blocked
                ? `This will reactivate access for ${selectedCustomer.name} (${selectedCustomer.email}).`
                : `Blocking ${selectedCustomer.name} (${selectedCustomer.email}) will immediately prevent access and show the blocked screen with contact options.`}
            </p>

            {!selectedCustomer.is_blocked && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "4px",
                  }}
                >
                  Block Reason (Visible to customer)
                </label>
                <textarea
                  rows={3}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Account suspended due to policy violations."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "13.5px",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setBlockModalOpen(false);
                  setSelectedCustomer(null);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isToggling}
                onClick={handleConfirmToggleBlock}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: selectedCustomer.is_blocked
                    ? "#10b981"
                    : "#ef4444",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isToggling
                  ? "Processing..."
                  : selectedCustomer.is_blocked
                  ? "Confirm Unblock"
                  : "Confirm Block"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteModalOpen && selectedCustomer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
            }}
          >
            <h3
              style={{
                margin: "0 0 10px 0",
                fontSize: "18px",
                fontWeight: 700,
                color: "#dc2626",
              }}
            >
              Delete Customer?
            </h3>
            <p style={{ fontSize: "14px", color: "#4b5563", margin: "0 0 20px 0" }}>
              Are you sure you want to permanently delete{" "}
              <b>{selectedCustomer.name}</b> ({selectedCustomer.email})? This
              action cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedCustomer(null);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK BLOCK MODAL */}
      {bulkBlockModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              padding: "24px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ban size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
                  Block {selectedIds.length} Customer(s)
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
                  Blocked customers will be prevented from placing orders or logging in.
                </p>
              </div>
            </div>

            <form onSubmit={handleBulkBlockSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "4px",
                  }}
                >
                  Block Reason (Visible to customers)
                </label>
                <textarea
                  rows={3}
                  value={bulkBlockReason}
                  onChange={(e) => setBulkBlockReason(e.target.value)}
                  placeholder="e.g. Account suspended due to terms violation."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "13.5px",
                    outline: "none",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setBulkBlockModalOpen(false);
                    setBulkBlockReason("");
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    color: "#374151",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBulkUpdating}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isBulkUpdating ? "Blocking..." : `Confirm Block (${selectedIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRM MODAL */}
      {bulkDeleteConfirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              padding: "24px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
                Delete {selectedIds.length} Customers?
              </h3>
            </div>
            <p style={{ fontSize: "14px", color: "#4b5563", margin: "0 0 20px 0" }}>
              Are you sure you want to permanently delete {selectedIds.length} selected customer account(s)? This action cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={confirmBulkDelete}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isBulkDeleting ? "Deleting..." : `Delete Permanently (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
