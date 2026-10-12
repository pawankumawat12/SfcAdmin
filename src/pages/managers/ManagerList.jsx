import { useState } from "react";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  UserPlus,
  Mail,
  Phone,
  Edit3,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  Ban,
  X,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  useGetManagersQuery,
  useCreateManagerMutation,
  useUpdateManagerMutation,
  useResendManagerInviteMutation,
  useDeleteManagerMutation,
} from "../../services/managerApi";
import {
  SIDEBAR_PERMISSION_GROUPS,
  ALL_SIDEBAR_PERMISSION_ITEMS,
  PERMISSION_LABEL_MAP,
  normalizePermissionsArray,
} from "../../utils/managerPermissions";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export function ManagerList() {
  const { data, isLoading, isFetching, refetch } = useGetManagersQuery();
  const [createManager, { isLoading: isCreating }] = useCreateManagerMutation();
  const [updateManager, { isLoading: isUpdating }] = useUpdateManagerMutation();
  const [resendInvite] = useResendManagerInviteMutation();
  const [deleteManager, { isLoading: isDeleting }] = useDeleteManagerMutation();

  const managers = data?.managers || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    permissions: ["dashboard", "orders", "pos"],
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [generatedSetupUrl, setGeneratedSetupUrl] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const openCreateModal = () => {
    setEditingManager(null);
    setFormState({
      name: "",
      email: "",
      phone: "",
      permissions: ["dashboard", "orders", "pos"],
    });
    setModalOpen(true);
  };

  const openEditModal = (mgr) => {
    setEditingManager(mgr);
    setFormState({
      name: mgr.name || "",
      email: mgr.email || "",
      phone: mgr.phone || "",
      permissions: normalizePermissionsArray(mgr.permissions),
    });
    setModalOpen(true);
  };

  const togglePermission = (key) => {
    setFormState((prev) => {
      const exists = prev.permissions.includes(key);
      const next = exists
        ? prev.permissions.filter((k) => k !== key)
        : [...prev.permissions, key];
      return { ...prev, permissions: next };
    });
  };

  const selectAllPermissions = () => {
    setFormState((prev) => ({
      ...prev,
      permissions: ALL_SIDEBAR_PERMISSION_ITEMS.map((i) => i.key),
    }));
  };

  const clearAllPermissions = () => {
    setFormState((prev) => ({
      ...prev,
      permissions: [],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      toast.error("Please enter manager name");
      return;
    }
    if (!editingManager && !formState.email.trim()) {
      toast.error("Please enter manager email");
      return;
    }
    if (formState.permissions.length === 0) {
      toast.error("Please select at least one sidebar tab permission");
      return;
    }

    try {
      if (editingManager) {
        const res = await updateManager({
          id: editingManager.id,
          name: formState.name.trim(),
          phone: formState.phone.trim(),
          permissions: formState.permissions,
        }).unwrap();
        toast.success(res?.message || "Manager updated successfully!");
        setModalOpen(false);
      } else {
        const res = await createManager({
          name: formState.name.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          permissions: formState.permissions,
        }).unwrap();
        toast.success(
          res?.message || "Manager created & password setup link sent to email!"
        );
        setModalOpen(false);
        if (res?.setupUrl) {
          setGeneratedSetupUrl({
            name: formState.name.trim(),
            email: formState.email.trim(),
            url: res.setupUrl,
          });
        }
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save manager");
    }
  };

  const handleResendInvite = async (mgr) => {
    try {
      setResendingId(mgr.id);
      const res = await resendInvite(mgr.id).unwrap();
      toast.success(res?.message || `Password setup link sent to ${mgr.email}`);
      if (res?.setupUrl) {
        setGeneratedSetupUrl({
          name: mgr.name,
          email: mgr.email,
          url: res.setupUrl,
        });
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to resend setup link");
    } finally {
      setResendingId(null);
    }
  };

  const handleToggleActive = async (mgr) => {
    if (!mgr.has_password) {
      toast.error(
        "Manager has not set their password yet. Resend the setup link so they can activate their account."
      );
      return;
    }
    const nextBlocked = !mgr.is_blocked;
    try {
      await updateManager({
        id: mgr.id,
        is_blocked: nextBlocked,
        is_active: !nextBlocked,
      }).unwrap();
      toast.success(
        `Manager "${mgr.name}" ${nextBlocked ? "deactivated" : "activated"} successfully.`
      );
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteManager(deleteTarget.id).unwrap();
      toast.success(res?.message || "Manager deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete manager");
    }
  };

  const handleCopySetupUrl = () => {
    if (!generatedSetupUrl?.url) return;
    navigator.clipboard.writeText(generatedSetupUrl.url);
    setCopiedLink(true);
    toast.success("Password setup link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "20px 24px",
          border: "1px solid #e2e8f0",
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
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              display: "grid",
              placeItems: "center",
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
              Managers &amp; Staff Access
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
              Create managers, assign specific sidebar tabs, and send email password setup links.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              padding: "9px 14px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCw size={15} className={isFetching ? "spin" : ""} />
            Refresh
          </button>

          <Button
            onClick={openCreateModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
            }}
          >
            <UserPlus size={17} />
            Add New Manager
          </Button>
        </div>
      </div>

      {/* Setup Link Banner (shown right after creating/resending so Admin can also copy link if needed) */}
      {generatedSetupUrl && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#14532d" }}>
              Password Setup Link Sent to {generatedSetupUrl.email}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#166534",
                marginTop: "4px",
                wordBreak: "break-all",
              }}
            >
              {generatedSetupUrl.url}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCopySetupUrl}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #16a34a",
                background: "#166534",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              {copiedLink ? "Copied" : "Copy Setup Link"}
            </button>
            <button
              type="button"
              onClick={() => setGeneratedSetupUrl(null)}
              style={{
                padding: "6px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "#166534",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Managers List Table */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b" }}>
            Loading managers...
          </div>
        ) : managers.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#f1f5f9",
                color: "#64748b",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 14px",
              }}
            >
              <ShieldCheck size={28} />
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
              No Managers Created Yet
            </h3>
            <p style={{ margin: "0 auto 18px", maxWidth: "420px", fontSize: "13px", color: "#64748b" }}>
              Create a manager and select which sidebar tabs they can access. They will receive an email link to set their password.
            </p>
            <Button onClick={openCreateModal}>
              <UserPlus size={16} style={{ marginRight: "6px" }} />
              Create First Manager
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    textAlign: "left",
                    color: "#475569",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  <th style={{ padding: "14px 20px", fontWeight: 700 }}>Manager Details</th>
                  <th style={{ padding: "14px 20px", fontWeight: 700 }}>Account Status</th>
                  <th style={{ padding: "14px 20px", fontWeight: 700 }}>Allowed Sidebar Tabs</th>
                  <th style={{ padding: "14px 20px", fontWeight: 700, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((mgr) => {
                  const perms = normalizePermissionsArray(mgr.permissions);
                  const isActive = mgr.has_password && mgr.is_active && !mgr.is_blocked;
                  const isPending = !mgr.has_password;

                  return (
                    <tr
                      key={mgr.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                          {mgr.name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#64748b",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          <Mail size={13} />
                          <span>{mgr.email}</span>
                        </div>
                        {mgr.phone && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "#64748b",
                              fontSize: "12px",
                              marginTop: "2px",
                            }}
                          >
                            <Phone size={13} />
                            <span>{mgr.phone}</span>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        {isPending ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: "#fef3c7",
                              color: "#b45309",
                            }}
                          >
                            <Clock size={12} />
                            Pending Password Setup
                          </span>
                        ) : isActive ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: "#dcfce7",
                              color: "#15803d",
                            }}
                          >
                            <CheckCircle2 size={12} />
                            Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: "#fee2e2",
                              color: "#dc2626",
                            }}
                          >
                            <Ban size={12} />
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "16px 20px", verticalAlign: "top", maxWidth: "440px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {perms.length === 0 ? (
                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                              No tabs assigned
                            </span>
                          ) : (
                            perms.map((key) => (
                              <span
                                key={key}
                                style={{
                                  padding: "3px 9px",
                                  borderRadius: "6px",
                                  background: "#f0fdf4",
                                  border: "1px solid #bbf7d0",
                                  color: "#166534",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                }}
                              >
                                {PERMISSION_LABEL_MAP[key] || key}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "16px 20px",
                          verticalAlign: "top",
                          textAlign: "right",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => openEditModal(mgr)}
                            title="Edit Sidebar Tabs & Details"
                            style={{
                              padding: "6px 11px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              color: "#1e293b",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <Edit3 size={13} />
                            Edit Tabs
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResendInvite(mgr)}
                            disabled={resendingId === mgr.id}
                            title="Send / Resend Password Setup Email"
                            style={{
                              padding: "6px 11px",
                              borderRadius: "8px",
                              border: "1px solid #bbf7d0",
                              background: "#f0fdf4",
                              color: "#166534",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <Send size={13} />
                            {resendingId === mgr.id ? "Sending..." : "Send Password Link"}
                          </button>

                          {mgr.has_password && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(mgr)}
                              style={{
                                padding: "6px 11px",
                                borderRadius: "8px",
                                border: isActive ? "1px solid #fecaca" : "1px solid #bbf7d0",
                                background: isActive ? "#fef2f2" : "#f0fdf4",
                                color: isActive ? "#dc2626" : "#15803d",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(mgr)}
                            title="Delete Manager"
                            style={{
                              padding: "6px 8px",
                              borderRadius: "8px",
                              border: "1px solid #fecaca",
                              background: "#fef2f2",
                              color: "#dc2626",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Manager Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(3px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                  {editingManager ? `Edit Manager: ${editingManager.name}` : "Create New Manager"}
                </h2>
                <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
                  {editingManager
                    ? "Update manager details and customize which sidebar tabs they can access."
                    : "Enter manager details and select allowed sidebar tabs. A password setup link will be emailed."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  color: "#475569",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={handleSubmit}
              style={{
                padding: "20px 24px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "14px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Manager Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formState.name}
                    onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingManager)}
                    placeholder="manager@example.com"
                    value={formState.email}
                    onChange={(e) => setFormState((p) => ({ ...p, email: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: editingManager ? "#f1f5f9" : "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={formState.phone}
                    onChange={(e) => setFormState((p) => ({ ...p, phone: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              {/* Sidebar Tab Permissions Section */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                      Select Allowed Sidebar Tabs ({formState.permissions.length} selected) *
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                      Only the checked tabs below will be visible and accessible to this manager.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "7px",
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        color: "#166534",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "7px",
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        color: "#64748b",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {SIDEBAR_PERMISSION_GROUPS.map((group) => (
                    <div
                      key={group.groupTitle}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "12px 14px",
                        background: "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                          color: "#475569",
                          marginBottom: "8px",
                        }}
                      >
                        {group.groupTitle}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                        {group.items.map((item) => {
                          const checked = formState.permissions.includes(item.key);
                          return (
                            <label
                              key={item.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: checked ? 700 : 500,
                                color: checked ? "#166534" : "#334155",
                                padding: "5px 8px",
                                borderRadius: "8px",
                                background: checked ? "#dcfce7" : "#ffffff",
                                border: checked ? "1px solid #86efac" : "1px solid #e2e8f0",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(item.key)}
                                style={{ accentColor: "#166534", width: "15px", height: "15px" }}
                              />
                              <span>{item.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  paddingTop: "12px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {editingManager
                    ? isUpdating
                      ? "Saving..."
                      : "Save Manager Permissions"
                    : isCreating
                      ? "Creating & Sending Invite..."
                      : "Create Manager & Send Password Link"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Manager Account?"
        message={
          deleteTarget
            ? `Are you sure you want to permanently remove manager "${deleteTarget.name}" (${deleteTarget.email})? Their portal access will be revoked immediately.`
            : ""
        }
        confirmText={isDeleting ? "Deleting..." : "Delete Manager"}
        isLoading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default ManagerList;

