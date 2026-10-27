import React, { useState, useMemo, useEffect } from "react";
import {
  Mail,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  KeyRound,
  X,
  LoaderCircle,
  Inbox,
} from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "../../components/ui/Pagination";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import DataTable from "../../components/common/DataTable";
import useDebouncedValue from "../../utils/useDebouncedValue";
import {
  useGetEmailLogsQuery,
  useGetEmailLogStatsQuery,
  useGetEmailLogByIdQuery,
  useDeleteEmailLogMutation,
  useBulkDeleteEmailLogsMutation,
} from "../../services/emailLogApi";

export default function EmailLogList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedIds, setSelectedIds] = useState([]);

  // Detail Modal State
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [previewTab, setPreviewTab] = useState("preview"); // 'preview' | 'html' | 'text'
  const [copiedField, setCopiedField] = useState("");

  // Delete Confirmations
  const [singleDeleteId, setSingleDeleteId] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 500);

  // Queries & Mutations
  const {
    data: logsResponse,
    isLoading: loadingLogs,
    isFetching,
    refetch,
  } = useGetEmailLogsQuery({
    page,
    limit,
    search: debouncedSearch,
    email_type: typeFilter,
    status: statusFilter,
    sort_by: "created_at",
    sort_order: sortOrder,
  });

  const { data: statsResponse } = useGetEmailLogStatsQuery();

  const { data: logDetailResponse, isFetching: loadingDetail } =
    useGetEmailLogByIdQuery(selectedLogId, {
      skip: !selectedLogId,
    });

  const [deleteEmailLog, { isLoading: isDeletingSingle }] =
    useDeleteEmailLogMutation();
  const [bulkDeleteLogs, { isLoading: isDeletingBulk }] =
    useBulkDeleteEmailLogsMutation();

  const rawLogs = logsResponse?.data || [];
  const pagination = logsResponse?.pagination || {
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  };

  const stats = statsResponse?.data || {
    total: 0,
    sent: 0,
    failed: 0,
    otp: 0,
    password_reset: 0,
  };

  const activeLog = logDetailResponse?.data || null;

  const processedBodyHtml = useMemo(() => {
    if (!activeLog?.body_html) return "";
    let html = activeLog.body_html;

    // Ensure every <a> tag has target="_blank" and rel="noopener noreferrer"
    html = html.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
      const cleanAttrs = attrs
        .replace(/\btarget\s*=\s*(['"]).*?\1/gi, "")
        .replace(/\brel\s*=\s*(['"]).*?\1/gi, "");
      return `<a target="_blank" rel="noopener noreferrer"${cleanAttrs}>`;
    });

    const scriptTag = `
      <base target="_blank" />
      <script>
        document.addEventListener('click', function(e) {
          var anchor = e.target.closest('a');
          if (anchor && anchor.href) {
            e.preventDefault();
            window.open(anchor.href, '_blank', 'noopener,noreferrer');
          }
        }, true);
      </script>
    `;

    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head[^>]*>/i, (m) => `${m}${scriptTag}`);
    }

    return `<!DOCTYPE html><html><head>${scriptTag}<meta charset="utf-8"/><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#ffffff;}</style></head><body>${html}</body></html>`;
  }, [activeLog?.body_html]);

  // Keep page and limit synchronized with backend response
  useEffect(() => {
    if (logsResponse?.pagination) {
      const backendLimit = Number(logsResponse.pagination.limit);
      if (backendLimit && backendLimit !== limit) {
        setLimit(backendLimit);
      }
      const backendTotalPages = Number(logsResponse.pagination.totalPages) || 1;
      if (page > backendTotalPages) {
        setPage(backendTotalPages);
      }
    }
  }, [logsResponse?.pagination, page, limit]);

  // Clear selected checkboxes when changing page, limit, or filters
  useEffect(() => {
    setSelectedIds([]);
  }, [page, limit, debouncedSearch, typeFilter, statusFilter]);

  const handlePageChange = (newPage) => {
    const targetPage = Number(newPage);
    const maxPage = Number(pagination?.totalPages) || 1;
    if (targetPage >= 1 && targetPage <= maxPage && targetPage !== page) {
      setPage(targetPage);
    }
  };

  const handleLimitChange = (newLimit) => {
    const targetLimit = Number(newLimit) || 10;
    if (targetLimit !== limit) {
      setLimit(targetLimit);
      setPage(1);
    }
  };
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = rawLogs.map((l) => l.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    rawLogs.length > 0 && selectedIds.length === rawLogs.length;

  // Single Delete
  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteId) return;
    try {
      await deleteEmailLog(singleDeleteId).unwrap();
      toast.success("Email log deleted successfully");
      if (selectedLogId === singleDeleteId) {
        setSelectedLogId(null);
      }
      setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteId));
      setSingleDeleteId(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete email log");
    }
  };

  // Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkDeleteLogs(selectedIds).unwrap();
      toast.success(res?.message || "Selected email logs deleted");
      if (selectedIds.includes(selectedLogId)) {
        setSelectedLogId(null);
      }
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete selected logs");
    }
  };

  // Copy helper
  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName}!`);
    setTimeout(() => setCopiedField(""), 2000);
  };

  // Render badge helper
  const renderTypeBadge = (type) => {
    const t = String(type || "").toLowerCase();
    let bg = "#f1f5f9";
    let color = "#475569";
    let label = type;

    if (t === "otp") {
      bg = "#ede9fe";
      color = "#6d28d9";
      label = "OTP Verification";
    } else if (t === "email_change_otp") {
      bg = "#e0e7ff";
      color = "#4338ca";
      label = "Email Change OTP";
    } else if (t === "password_reset") {
      bg = "#fef3c7";
      color = "#b45309";
      label = "Password Reset";
    } else if (t === "test_smtp") {
      bg = "#e2e8f0";
      color = "#334155";
      label = "SMTP Test";
    } else {
      bg = "#f1f5f9";
      color = "#475569";
      label = "General";
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 8px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 600,
          background: bg,
          color: color,
        }}
      >
        {t.includes("otp") && <KeyRound size={12} />}
        {label}
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "sent") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 600,
            background: "#dcfce7",
            color: "#166534",
          }}
        >
          <CheckCircle2 size={12} />
          Sent
        </span>
      );
    }
    if (s === "failed") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 600,
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          <XCircle size={12} />
          Failed
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 8px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 600,
          background: "#f1f5f9",
          color: "#64748b",
        }}
      >
        <AlertCircle size={12} />
        Disabled
      </span>
    );
  };

  const columns = useMemo(
    () => [
      {
        key: "select",
        label: (
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleSelectAll}
            style={{ cursor: "pointer" }}
            aria-label="Select all email logs"
          />
        ),
        minWidth: "50px",
        maxWidth: "60px",
        render: (_, log) => {
          const isSelected = selectedIds.includes(log.id);
          return (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectOne(log.id)}
              style={{ cursor: "pointer" }}
              aria-label={`Select log ${log.id}`}
            />
          );
        },
      },
      {
        key: "recipient",
        label: "Recipient",
        minWidth: "220px",
        render: (_, log) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{log.recipient}</span>
                <Button
                  variant="plain"
                  onClick={() => handleCopy(log.recipient, "email")}
                  title="Copy email address"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: copiedField === "email" ? "#16a34a" : "#9ca3af",
                  }}
                >
                  {copiedField === "email" ? <Check size={12} /> : <Copy size={12} />}
                </Button>
              </div>
              {log.user_name && (
                <div style={{ fontSize: "11px", color: "#6b7280" }}>
                  {log.user_name}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "subject",
        label: "Subject",
        minWidth: "220px",
        maxWidth: "340px",
        render: (_, log) => (
          <div>
            <div
              style={{
                fontWeight: 600,
                color: "#1f2937",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={log.subject}
            >
              {log.subject}
            </div>
            {log.preview_text && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: "2px",
                }}
              >
                {log.preview_text}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "email_type",
        label: "Type",
        minWidth: "130px",
        render: (_, log) => renderTypeBadge(log.email_type),
      },
      {
        key: "status",
        label: "Status",
        minWidth: "130px",
        render: (_, log) => (
          <div>
            {renderStatusBadge(log.status)}
            {log.error_message && (
              <div
                style={{
                  fontSize: "10px",
                  color: "#ef4444",
                  marginTop: "2px",
                  maxWidth: "150px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={log.error_message}
              >
                {log.error_message}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "created_at",
        label: "Timestamp",
        minWidth: "140px",
        render: (_, log) => {
          const dateObj = new Date(log.created_at);
          const formattedDate = dateObj.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          const formattedTime = dateObj.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          return (
            <div style={{ color: "#4b5563" }}>
              <div style={{ fontWeight: 500 }}>{formattedDate}</div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>{formattedTime}</div>
            </div>
          );
        },
      },
    ],
    [isAllSelected, selectedIds, copiedField]
  );

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "grid",
                placeItems: "center",
                color: "#166534",
              }}
            >
              <Mail size={22} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#111827",
                  margin: 0,
                }}
              >
                Email Logs
              </h1>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                Audit, inspect, and preview all outgoing system emails, OTP verifications, and delivery statuses.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {selectedIds.length > 0 && (
            <Button
              variant="danger"
              onClick={() => setBulkDeleteConfirm(true)}
            >
              <Trash2 size={15} />
              Delete Selected ({selectedIds.length})
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={15} className={isFetching ? "spin animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>


      {/* Filter and Search Ribbon */}
      <div
        style={{
          background: "#ffffff",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          marginBottom: "16px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flex: "1 1 300px",
            position: "relative",
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              color: "#9ca3af",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search recipient email, subject, or content..."
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
              outline: "none",
            }}
          />
          {search && (
            <Button
              variant="plain"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: "10px",
                background: "transparent",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
                padding: "4px",
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </Button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            <option value="all">All Email Types</option>
            <option value="otp">OTP Verification</option>
            <option value="email_change_otp">Email Change OTP</option>
            <option value="password_reset">Password Reset</option>
            <option value="test_smtp">SMTP Test</option>
            <option value="general">General</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="disabled">Disabled</option>
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>

    
        </div>
      </div>

      {/* EMAIL LOGS DATA TABLE */}
      <DataTable
        loading={loadingLogs || isFetching}
        data={rawLogs}
        columns={columns}
        emptyMessage="No email logs found."
        renderActions={(log) => (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Button
              variant="view"
              onClick={() => {
                setSelectedLogId(log.id);
                setPreviewTab("preview");
              }}
              title="View complete email"
              style={{ height: "32px", padding: "0 10px", fontSize: "12px" }}
              aria-label="View complete email"
            >
              <Eye size={14} />
            </Button>

            <Button
              variant="delete"
              onClick={() => setSingleDeleteId(log.id)}
              title="Delete email log"
              style={{ height: "32px", padding: "0 10px" }}
              aria-label="Delete email log"
            >
              <Trash2 size={15} />
            </Button>
          </div>
        )}
      />

      {/* Integrated Pagination */}
      <div style={{ marginTop: "16px" }}>
        <Pagination
          page={page}
          totalPages={pagination.totalPages || 1}
          total={pagination.total || 0}
          limit={pagination.limit || limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          limitOptions={[10, 20, 50, 100]}
          itemLabel="emails"
        />
      </div>

      {selectedLogId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "850px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
                background: "#f9fafb",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  {activeLog && renderTypeBadge(activeLog.email_type)}
                  {activeLog && renderStatusBadge(activeLog.status)}
                </div>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#111827",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loadingDetail ? "Loading..." : activeLog?.subject}
                </h2>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
               <Button
                  variant="plain"
                  onClick={() => setSelectedLogId(null)}
                  style={{
                    background: "#f3f4f6",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    display: "grid",
                    placeItems: "center",
                  }}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </Button>
              </div>
            </div>

            {/* Email Metadata Bar */}
            {activeLog && (
              <div
                style={{
                  padding: "12px 24px",
                  background: "#ffffff",
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: "12px",
                  color: "#4b5563",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "10px",
                }}
              >
                <div>
                  <span style={{ color: "#9ca3af" }}>To: </span>
                  <strong style={{ color: "#111827" }}>{activeLog.recipient}</strong>
                </div>
                {activeLog.sender && (
                  <div>
                    <span style={{ color: "#9ca3af" }}>From: </span>
                    <span style={{ color: "#374151" }}>{activeLog.sender}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: "#9ca3af" }}>Sent: </span>
                  <span>{new Date(activeLog.created_at).toLocaleString("en-IN")}</span>
                </div>
                {activeLog.message_id && (
                  <div
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={activeLog.message_id}
                  >
                    <span style={{ color: "#9ca3af" }}>ID: </span>
                    <code style={{ fontSize: "11px", color: "#6b7280" }}>{activeLog.message_id}</code>
                  </div>
                )}
              </div>
            )}

            {/* Failure Alert Banner (if failed) */}
            {activeLog?.status === "failed" && activeLog.error_message && (
              <div
                style={{
                  padding: "12px 24px",
                  background: "#fee2e2",
                  borderBottom: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Delivery Failure:</strong> {activeLog.error_message}
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div
              style={{
                padding: "8px 24px 0",
                background: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                gap: "8px",
              }}
            >
            </div>

            {/* Modal Body / Tab Content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                background: previewTab === "preview" ? "#f3f4f6" : "#ffffff",
                padding: previewTab === "preview" ? "20px" : "16px",
              }}
            >
              {loadingDetail ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                  <LoaderCircle size={24} className="animate-spin text-blue-600" style={{ margin: "0 auto 10px" }} />
                  <div>Loading email content...</div>
                </div>
              ) : previewTab === "preview" ? (
                /* EXACT HTML PREVIEW IN SANDBOXED IFRAME */
                <div
                  style={{
                    maxWidth: "600px",
                    margin: "0 auto",
                    background: "#ffffff",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {activeLog?.body_html ? (
                    <iframe
                      title="Email HTML Preview"
                      srcDoc={processedBodyHtml}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
                      style={{
                        width: "100%",
                        height: "440px",
                        border: "none",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                      No HTML content recorded for this email.
                    </div>
                  )}
                </div>
              ) : previewTab === "html" ? (
                /* RAW HTML CODE TAB */
                <div style={{ position: "relative" }}>
                  <Button
                    variant="outline"
                    onClick={() => handleCopy(activeLog?.body_html || "", "Raw HTML")}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      height: "28px",
                      padding: "0 8px",
                      fontSize: "11px",
                      background: "rgba(255, 255, 255, 0.15)",
                      color: "#ffffff",
                      borderColor: "rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <Copy size={12} />
                    Copy Code
                  </Button>
                  <pre
                    style={{
                      background: "#1e293b",
                      color: "#f8fafc",
                      padding: "16px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      overflowX: "auto",
                      maxHeight: "420px",
                      fontFamily: "monospace",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {activeLog?.body_html || "<!-- No HTML recorded -->"}
                  </pre>
                </div>
              ) : (
                /* PLAIN TEXT TAB */
                <div>
                  <pre
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      padding: "16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: "#374151",
                      whiteSpace: "pre-wrap",
                      fontFamily: "monospace",
                      lineHeight: 1.6,
                      maxHeight: "420px",
                      overflowY: "auto",
                      margin: 0,
                    }}
                  >
                    {activeLog?.body_text || activeLog?.body_html?.replace(/<[^>]*>/g, "") || "No text version available"}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f9fafb",
              }}
            >
              <Button
                variant="danger"
                onClick={() => {
                  setSingleDeleteId(activeLog?.id);
                }}
              >
                <Trash2 size={14} />
                Delete Log
              </Button>

              <Button
                variant="outline"
                onClick={() => setSelectedLogId(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONFIRMATION DIALOGS                                      */}
      {/* ========================================================= */}
      {singleDeleteId && (
      <ConfirmDialog
        open={singleDeleteId}
        title="Delete Email Log"
        message="Are you sure you want to delete this email log? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={isDeletingSingle}
        onConfirm={handleConfirmSingleDelete}
        onCancel={() => setSingleDeleteId(null)}
      />
    )}
{
  bulkDeleteConfirm && (
      <ConfirmDialog
        open={bulkDeleteConfirm}
        title={`Delete ${selectedIds.length} Email Logs`}
        message={`Are you sure you want to delete these ${selectedIds.length} selected email logs permanently? This action cannot be undone.`}
        confirmText="Delete All Selected"
        confirmVariant="danger"
        isLoading={isDeletingBulk}
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />
    )
}
    </div>
  );
}

