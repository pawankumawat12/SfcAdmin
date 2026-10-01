import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Mail,
  User,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Eye,
  MessageCircle,
  Banknote,
  Calendar,
  Package,
  RefreshCw,
  Printer,
  Download,
  FileSpreadsheet,
  History,
  BadgeIndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import Pagination from "../../components/ui/Pagination";
import useDebouncedValue from "../../utils/useDebouncedValue";
import {
  useGetAdminOrdersQuery,
  useUpdateOrderStatusMutation,
} from "../../services/orderApi";
import {
  useGetStoreByIdQuery,
  useGetStoreSettlementSummaryQuery,
} from "../../services/storeApi";
import OrderDetailsModal from "../../modals/OrderDetailsModal";
import AdminOrderChatModal from "../../components/orders/AdminOrderChatModal";
import StoreSettlementModal from "../../modals/StoreSettlementModal";
import RecordPayoutModal from "../../modals/RecordPayoutModal";
import StorePayoutsHistoryModal from "../../modals/StorePayoutsHistoryModal";
import { exportToCsv } from "../../utils/csvExport";
import { getAdminSocket } from "../../services/socket";

export default function StoreOrderList() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth?.user);
  const isAdmin = authUser?.role === "admin";

  // Fetch store details
  const {
    data: storeData,
    isLoading: isStoreLoading,
  } = useGetStoreByIdQuery(storeId);
  const store = storeData?.store;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 500);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected Order for View Details and Chat Modals
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isRecordPayoutModalOpen, setIsRecordPayoutModalOpen] = useState(false);
  const [isPayoutHistoryModalOpen, setIsPayoutHistoryModalOpen] = useState(false);

  // Fetch Store Settlement Summary (Lifetime vs Settled vs Current Pending)
  const {
    data: settlementSummaryData,
    refetch: refetchSettlementSummary,
  } = useGetStoreSettlementSummaryQuery(storeId, { skip: !storeId });

  const lifetimeData = settlementSummaryData?.data?.lifetime;
  const settlementData = settlementSummaryData?.data?.settlement;

  const { startDate, endDate, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    if (dateFilter === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return {
        startDate: d.toISOString(),
        endDate: now.toISOString(),
        dateRangeLabel: "Last 7 Days",
      };
    }
    if (dateFilter === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: start.toISOString(),
        endDate: now.toISOString(),
        dateRangeLabel: `This Month (${now.toLocaleString("en-IN", { month: "short" })})`,
      };
    }
    if (dateFilter === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dateRangeLabel: `Last Month (${start.toLocaleString("en-IN", { month: "short" })})`,
      };
    }
    return { startDate: undefined, endDate: undefined, dateRangeLabel: "All Time" };
  }, [dateFilter]);

  // Fetch store orders
  const {
    data: orderResponse,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
    error: ordersError,
    refetch: refetchOrders,
  } = useGetAdminOrdersQuery({
    store_id: storeId,
    page,
    limit,
    status: statusFilter || undefined,
    search: debouncedSearch.trim() || undefined,
    startDate,
    endDate,
  });

  const [updateStatus, { isLoading: isUpdatingStatus }] =
    useUpdateOrderStatusMutation();

  const rawOrders = orderResponse?.data || [];
  // Never show orders delivered directly by Admin without being dispatched to the store
  const orders = useMemo(() => {
    return rawOrders.filter((o) => {
      const isDirectAdminDelivered =
        !o.is_forwarded_to_store &&
        ["delivered", "completed"].includes(String(o.status || "").toLowerCase());
      return !isDirectAdminDelivered;
    });
  }, [rawOrders]);

  const pagination = orderResponse?.pagination;
  const stats = orderResponse?.stats || {};

  const totalOrdersCount = stats.totalOrders ?? pagination?.total ?? orders.length;
  const validOrders = orders.filter((o) => {
    const s = String(o.status || "").toLowerCase();
    const p = String(o.payment_status || "").toLowerCase();
    return !["cancelled", "rejected", "payment failed"].includes(s) && !["failed", "refunded"].includes(p);
  });
  const fallbackRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalRevenueAmount = stats.totalAmount !== undefined ? stats.totalAmount : fallbackRevenue;
  const deliveredCount = stats.deliveredOrders ?? 0;
  const pendingCount = stats.pendingOrders ?? 0;

  const isCodOrder = (o) => {
    const m = String(o.payment_method || "").toLowerCase();
    return m.includes("cash") || m.includes("cod");
  };

  const onlineOrders = validOrders.filter((o) => !isCodOrder(o));
  const codOrders = validOrders.filter((o) => isCodOrder(o));

  const fallbackOnlinePayable = onlineOrders.reduce((sum, o) => {
    const payable = o.store_payable_amount !== undefined
      ? Number(o.store_payable_amount)
      : Math.max(0, (Number(o.subtotal || 0) + Number(o.delivery_fee || 0) + Number(o.packaging_fee || 0)) - (Number(o.admin_commission_amount) || 0));
    return sum + payable;
  }, 0);

  const fallbackOnlineCommission = onlineOrders.reduce((sum, o) => sum + (Number(o.admin_commission_amount) || 0), 0);
  const fallbackOnlineAmount = onlineOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const fallbackCodCommission = codOrders.reduce((sum, o) => sum + (Number(o.admin_commission_amount) || 0), 0);
  const fallbackCodAmount = codOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const fallbackCommission = validOrders.reduce((sum, o) => sum + (Number(o.admin_commission_amount) || 0), 0);
  const totalCommissionAmount = stats.totalCommission !== undefined ? stats.totalCommission : fallbackCommission;

  const fallbackStorePayable = validOrders.reduce((sum, o) => {
    const payable = o.store_payable_amount !== undefined
      ? Number(o.store_payable_amount)
      : Math.max(0, (Number(o.subtotal || 0) + Number(o.delivery_fee || 0) + Number(o.packaging_fee || 0)) - (Number(o.admin_commission_amount) || 0));
    return sum + payable;
  }, 0);
  const totalStorePayableAmount = stats.totalStorePayable !== undefined ? stats.totalStorePayable : fallbackStorePayable;

  const onlineOrdersCount = stats.onlineOrdersCount ?? onlineOrders.length;
  const onlineTotalAmount = stats.onlineTotalAmount !== undefined ? stats.onlineTotalAmount : fallbackOnlineAmount;
  const onlineStorePayable = stats.onlineStorePayable !== undefined ? stats.onlineStorePayable : fallbackOnlinePayable;
  const onlineCommission = stats.onlineCommission !== undefined ? stats.onlineCommission : fallbackOnlineCommission;

  const codOrdersCount = stats.codOrdersCount ?? codOrders.length;
  const codTotalAmount = stats.codTotalAmount !== undefined ? stats.codTotalAmount : fallbackCodAmount;
  const codCommission = stats.codCommission !== undefined ? stats.codCommission : fallbackCodCommission;

  // Net payout from Admin to Store:
  // Admin collected Online Money -> owes onlineStorePayable to Store
  // Store collected COD Cash -> owes codCommission to Admin
  const netStorePayout = stats.netStorePayout !== undefined ? stats.netStorePayout : (onlineStorePayable - codCommission);

  // Real-time live updates for branch orders
  useEffect(() => {
    const socket = getAdminSocket();
    if (!socket) return;

    const handleOrderEvent = (data) => {
      refetchOrders();
      if (data?.orderNumber) {
        toast(`Order #${data.orderNumber} updated: ${data.status || "Cancelled"}`, {
          icon: data.status === "Cancelled" ? "❌" : "ℹ️",
        });
      }
    };

    socket.on("admin_order_cancelled", handleOrderEvent);
    socket.on("admin_order_updated", handleOrderEvent);
    socket.on("admin_order_status_updated", handleOrderEvent);
    socket.on("admin_new_order", handleOrderEvent);

    return () => {
      socket.off("admin_order_cancelled", handleOrderEvent);
      socket.off("admin_order_updated", handleOrderEvent);
      socket.off("admin_order_status_updated", handleOrderEvent);
      socket.off("admin_new_order", handleOrderEvent);
    };
  }, [refetchOrders]);

  const handleExportStoreOrders = () => {
    if (!orders || orders.length === 0) {
      toast.error("No orders to export.");
      return;
    }
    const columns = [
      { key: "order_number", label: "Order #", getValue: (r) => r.order_number || `#${r.id}` },
      { key: "created_at", label: "Date & Time", getValue: (r) => new Date(r.created_at).toLocaleString("en-IN") },
      { key: "customer_name", label: "Customer Name", getValue: (r) => r.customer_name || "Guest" },
      { key: "customer_phone", label: "Customer Phone", getValue: (r) => r.customer_phone || "" },
      { key: "payment_method", label: "Payment Method", getValue: (r) => r.payment_method || "COD" },
      { key: "total_amount", label: "Order Total (₹)", getValue: (r) => Number(r.total_amount || 0).toFixed(2) },
      { key: "admin_commission_amount", label: "Admin Commission (₹)", getValue: (r) => Number(r.admin_commission_amount || 0).toFixed(2) },
      { key: "store_payable_amount", label: "Store Share (₹)", getValue: (r) => Number(r.store_payable_amount || 0).toFixed(2) },
      { key: "status", label: "Order Status", getValue: (r) => r.status || "Pending" },
    ];
    exportToCsv({
      filename: `orders-${store?.name?.replace(/\s+/g, "_") || "branch"}-${new Date().toISOString().slice(0, 10)}`,
      columns,
      data: orders,
    });
    toast.success(`Exported ${orders.length} order(s) to CSV (Excel)!`);
  };

  const handleStatusChange = async (orderId, nextStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (order && order.status === "Cancelled") {
      toast.error("This order has been cancelled and its status cannot be modified.");
      return;
    }
    try {
      await updateStatus({ id: orderId, status: nextStatus }).unwrap();
      toast.success(`Order #${orderId} status updated to ${nextStatus}`);
      refetchOrders();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update order status");
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "delivered") {
      return {
        bg: "#f0fdf4",
        color: "#15803d",
        border: "#bbf7d0",
        icon: <CheckCircle2 size={12} />,
      };
    }
    if (s === "cancelled" || s === "rejected") {
      return {
        bg: "#fef2f2",
        color: "#b91c1c",
        border: "#fecaca",
        icon: <XCircle size={12} />,
      };
    }
    if (s === "out for delivery" || s === "out_for_delivery") {
      return {
        bg: "#eff6ff",
        color: "#1d4ed8",
        border: "#bfdbfe",
        icon: <Truck size={12} />,
      };
    }
    return {
      bg: "#faf5ff",
      color: "#7e22ce",
      border: "#e9d5ff",
      icon: <Clock size={12} />,
    };
  };

  return (
    <>
      {/* Top Navigation & Breadcrumb */}
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
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#059669",
                  flexShrink: 0,
                }}
              >
                <ShoppingBag size={26} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#111827" }}>
                    {store?.name ? `${store.name} Orders` : (isStoreLoading ? "Loading store..." : "Store Orders")}
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
                      {store.is_open ? "BRANCH OPEN" : "BRANCH CLOSED"}
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
                      <User size={13} /> Owner: {store.owner_name}
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

            <div className="d-flex align-items-center gap-2 flex-wrap w-100 w-sm-auto mt-2 mt-sm-0">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="form-select form-select-sm"
                style={{ width: "auto", fontSize: "12px", fontWeight: 700, borderRadius: "8px", borderColor: "#cbd5e1" }}
              >
                <option value="all">Period: All Time</option>
                <option value="week">Period: Last 7 Days (Weekly)</option>
                <option value="month">Period: This Month</option>
                <option value="last_month">Period: Last Month</option>
              </select>
              <Button
                variant="outline"
                onClick={handleExportStoreOrders}
                title="Export Store Orders to CSV"
                className="flex-grow-1 flex-sm-grow-0 d-inline-flex align-items-center gap-1.5"
              >
                <FileSpreadsheet size={15} className="text-success" />
                <span>Export CSV</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsSettlementModalOpen(true)}
                title="View & Download Store Settlement PDF Statement"
                className="flex-grow-1 flex-sm-grow-0 d-inline-flex align-items-center gap-1.5"
              >
                <Printer size={15} />
                <span>Payout Statement (PDF)</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => refetchOrders()}
                disabled={isOrdersFetching}
                title="Refresh Orders"
                className="flex-grow-1 flex-sm-grow-0"
              >
                <RefreshCw size={15} className={isOrdersFetching ? "animate-spin" : ""} /> Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/stores/${storeId}/products`)}
                title="View Store Products"
                className="flex-grow-1 flex-sm-grow-0"
              >
                <Package size={15} /> Store Products
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Card Store Settlement & Financial Hub */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "14px",
          marginBottom: "18px",
        }}
      >
        {/* CARD 1: Lifetime Store Earnings & Total Business */}
        <div
          className="card"
          style={{
            padding: "16px 18px",
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            borderTop: "4px solid #4f46e5",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Lifetime Store Business (All-Time)
              </span>
              <span style={{ fontSize: "10.5px", background: "#eef2ff", color: "#4338ca", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                {lifetimeData?.total_orders ?? totalOrdersCount} Orders Total
              </span>
            </div>

            <div style={{ fontSize: "24px", fontWeight: 900, color: "#1e1b4b", marginTop: "6px" }}>
              ₹{Number(lifetimeData?.total_store_earnings ?? totalStorePayableAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
              Total Sales: <strong>₹{Number(lifetimeData?.total_gross_sales ?? totalRevenueAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
            <span>Admin Commission Kept:</span>
            <strong style={{ color: "#7c3aed" }}>₹{Number(lifetimeData?.total_admin_commission ?? totalCommissionAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
          </div>
        </div>

        {/* CARD 2: Total Disbursed / Settled Till Date */}
        <div
          className="card"
          style={{
            padding: "16px 18px",
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            borderTop: "4px solid #059669",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Disbursed / Settled
              </span>
              <span style={{ fontSize: "10.5px", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                {lifetimeData?.settled_orders_count ?? 0} Orders Settled
              </span>
            </div>

            <div style={{ fontSize: "24px", fontWeight: 900, color: "#065f46", marginTop: "6px" }}>
              ₹{Number(settlementData?.total_already_paid ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
              {settlementData?.last_payout ? (
                <span>
                  Last payout: <strong>₹{Number(settlementData.last_payout.amount || 0).toLocaleString("en-IN")}</strong> on{" "}
                  {new Date(settlementData.last_payout.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              ) : (
                <span>No past payouts recorded yet.</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #e2e8f0" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPayoutHistoryModalOpen(true)}
              className="w-100 d-inline-flex align-items-center justify-content-center gap-1.5"
              style={{ fontSize: "11.5px", padding: "5px 12px", borderRadius: "8px", borderColor: "#a7f3d0", color: "#047857" }}
            >
              <History size={13} />
              <span>View Past Payouts History</span>
            </Button>
          </div>
        </div>

        {/* CARD 3: Current Due / Active Cycle Pending */}
        <div
          className="card"
          style={{
            padding: "16px 18px",
            background: (settlementData?.current_pending_payout ?? netStorePayout) >= 0
              ? "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)"
              : "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            borderRadius: "14px",
            border: (settlementData?.current_pending_payout ?? netStorePayout) >= 0 ? "1px solid #a7f3d0" : "1px solid #fde68a",
            borderTop: (settlementData?.current_pending_payout ?? netStorePayout) >= 0 ? "4px solid #10b981" : "4px solid #f59e0b",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: (settlementData?.current_pending_payout ?? netStorePayout) >= 0 ? "#065f46" : "#92400e",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Current Pending Due (To Settle)
              </span>
              <span
                style={{
                  fontSize: "10.5px",
                  background: "#ffffff",
                  color: (settlementData?.current_pending_payout ?? netStorePayout) >= 0 ? "#047857" : "#b45309",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontWeight: 700,
                  border: "1px solid #cbd5e1",
                }}
              >
                {settlementData?.unsettled_orders_count ?? 0} Orders Due
              </span>
            </div>

            <div
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: (settlementData?.current_pending_payout ?? netStorePayout) >= 0 ? "#047857" : "#b45309",
                marginTop: "6px",
              }}
            >
              ₹{Number(Math.abs(settlementData?.current_pending_payout ?? netStorePayout)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "11.5px", color: "#475569", marginTop: "2px" }}>
              {(settlementData?.current_pending_payout ?? netStorePayout) >= 0 ? (
                <span>
                  Admin owes Store (Online: ₹{Number(settlementData?.unsettled_online_payable ?? onlineStorePayable).toLocaleString("en-IN", { maximumFractionDigits: 0 })} − COD Comm: ₹{Number(settlementData?.unsettled_cod_commission ?? codCommission).toLocaleString("en-IN", { maximumFractionDigits: 0 })})
                </span>
              ) : (
                <span>Store owes Admin (COD cash collected exceeds online earnings).</span>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: "12px",
              paddingTop: "10px",
              borderTop: "1px dashed #cbd5e1",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsRecordPayoutModalOpen(true)}
                className="flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1.5"
                style={{ fontSize: "11.5px", padding: "6px 12px", borderRadius: "8px" }}
              >
                <BadgeIndianRupee size={14} />
                <span>Record Payout & Settle</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettlementModalOpen(true)}
              className="flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1.5"
              style={{ fontSize: "11.5px", padding: "6px 12px", borderRadius: "8px", background: "#ffffff" }}
            >
              <Printer size={13} />
              <span>Statement (PDF)</span>
            </Button>
          </div>
        </div>
      </div>


      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {/* Card 1: Total Orders */}
        <div className="card" style={{ padding: "12px 14px", borderLeft: "4px solid #059669" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>
            Total Orders
          </span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827", marginTop: "2px" }}>
            {totalOrdersCount}
          </div>
          <span style={{ fontSize: "10.5px", color: "#6b7280" }}>
            Assigned to branch
          </span>
        </div>

        {/* Card 2: Total Revenue / Amount */}
        <div className="card" style={{ padding: "12px 14px", borderLeft: "4px solid #4f46e5" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#4f46e5", textTransform: "uppercase" }}>
            Order Volume
          </span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827", marginTop: "2px" }}>
            ₹{Number(totalRevenueAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "10.5px", color: "#6b7280" }}>
            Total customer bills
          </span>
        </div>

        {/* Card 3: Admin Commission */}
        <div className="card" style={{ padding: "12px 14px", borderLeft: "4px solid #7c3aed" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>
            Admin Commission
          </span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#7c3aed", marginTop: "2px" }}>
            ₹{Number(totalCommissionAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "10.5px", color: "#6b7280" }}>
            Platform fee kept
          </span>
        </div>

        {/* Card 4: Net Payable to Store */}
        <div className="card" style={{ padding: "12px 14px", borderLeft: "4px solid #16a34a" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>
            Net Store Payable
          </span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#16a34a", marginTop: "2px" }}>
            ₹{Number(totalStorePayableAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "10.5px", color: "#6b7280" }}>
            Payable to store owner
          </span>
        </div>

        {/* Card 5: Delivered Orders */}
        <div className="card" style={{ padding: "12px 14px", borderLeft: "4px solid #10b981" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>
            Delivered
          </span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#10b981", marginTop: "2px" }}>
            {deliveredCount}
          </div>
          <span style={{ fontSize: "10.5px", color: "#6b7280" }}>
            Completed
          </span>
        </div>

        {/* Card 6: Pending / In Progress */}
        <div className="card" style={{ padding: "12px 14px", borderLeft: "4px solid #d97706" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", textTransform: "uppercase" }}>
            In-Progress
          </span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#d97706", marginTop: "2px" }}>
            {pendingCount}
          </div>
          <span style={{ fontSize: "10.5px", color: "#6b7280" }}>
            Preparing / Transit
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card table-card">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Order #, customer name, phone, email..."
          />
          <div className="table-actions">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ minWidth: "170px" }}
            >
              <option value="">All Statuses</option>
              <option value="Preparing">Preparing</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </Select>
          </div>
        </div>

        {/* Mobile View: Clean Responsive Order Cards (hidden on md and up) */}
        <div className="d-block d-md-none p-2 p-sm-3">
          {isOrdersLoading ? (
            <div className="py-4 text-center text-muted">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <div>Loading branch orders...</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center text-muted py-5">
              No orders have been routed to this store yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {orders.map((order) => {
                const badge = getStatusBadge(order.status);
                const itemsCount = Array.isArray(order.items) ? order.items.length : 0;
                return (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "12px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    {/* Top Row: Order Number & Status Selector */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderDetails(order)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#4f46e5",
                            fontWeight: 800,
                            fontSize: "14px",
                            cursor: "pointer",
                            padding: 0,
                            textAlign: "left",
                          }}
                        >
                          #{order.order_number || order.id}
                        </button>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                          {order.created_at ? new Date(order.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }) : ""}
                        </div>
                      </div>

                      <Select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={isUpdatingStatus || order.status === "Delivered" || order.status === "Cancelled"}
                        style={{
                          padding: "3px 6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          borderColor: badge.border,
                          borderRadius: "8px",
                          width: "125px",
                          cursor: (order.status === "Delivered" || order.status === "Cancelled") ? "default" : "pointer",
                        }}
                      >
                        <option value="Preparing">Preparing</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </Select>
                    </div>

                    {/* Middle Row: Customer Info & Amount */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "8px 0",
                        borderTop: "1px solid #f1f5f9",
                        borderBottom: "1px solid #f1f5f9",
                        marginBottom: "8px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "12.5px" }}>
                          {order.customer_name || "Guest Customer"}
                        </div>
                        {order.customer_phone && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                            {order.customer_phone}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: "14px", color: "#111827" }}>
                          ₹{Number(order.total_amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                          {itemsCount} {itemsCount === 1 ? "item" : "items"} •{" "}
                          <span
                            style={{
                              fontWeight: 700,
                              color: order.payment_status === "Paid" ? "#15803d" : "#b45309",
                            }}
                          >
                            {order.payment_status || "Pending"}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: 700, marginTop: "2px", color: isCodOrder(order) ? "#b45309" : "#15803d" }}>
                          {isCodOrder(order) ? "Store Cash: " : "Admin Payout: "}
                          ₹{Number(order.store_payable_amount !== undefined ? order.store_payable_amount : Math.max(0, (Number(order.subtotal || 0) + Number(order.delivery_fee || 0) + Number(order.packaging_fee || 0)) - (Number(order.admin_commission_amount) || 0))).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Store Dispatch Pill + Action Buttons */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", flexWrap: "wrap" }}>
                      <div>
                        {order.is_forwarded_to_store ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              fontSize: "10.5px",
                              fontWeight: 700,
                              background: "#f0fdf4",
                              color: "#15803d",
                              border: "1px solid #bbf7d0",
                            }}
                          >
                            <CheckCircle2 size={11} /> Dispatched
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              fontSize: "10.5px",
                              fontWeight: 700,
                              background: "#fef3c7",
                              color: "#92400e",
                              border: "1px solid #fde68a",
                            }}
                          >
                            <Clock size={11} /> Pending Forward
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Button
                          variant="outline"
                          size="sm"
                          title="View Full Order Details"
                          onClick={() => setSelectedOrderDetails(order)}
                          style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <Eye size={12} /> View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Chat with Customer"
                          onClick={() => setActiveChatOrder(order)}
                          style={{ padding: "4px 8px", fontSize: "11px", color: "#4f46e5", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <MessageCircle size={12} /> Chat
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop View: Full DataTable (hidden on mobile, visible on md and up) */}
        <div className="d-none d-md-block">
          <DataTable
          loading={isOrdersLoading}
          error={ordersError?.data?.message || (ordersError ? "Failed to load orders" : null)}
          columns={[
            {
              key: "order_number",
              label: "ORDER #",
              sortable: true,
              render: (num, order) => (
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderDetails(order)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4f46e5",
                      fontWeight: 700,
                      fontSize: "13.5px",
                      cursor: "pointer",
                      padding: 0,
                      textAlign: "left",
                    }}
                  >
                    #{num || order.id}
                  </button>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {order.created_at ? new Date(order.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }) : ""}
                  </div>
                </div>
              ),
            },
            {
              key: "customer_name",
              label: "CUSTOMER",
              render: (_, order) => (
                <div>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: "13px" }}>
                    {order.customer_name || "Guest Customer"}
                  </div>
                  {order.customer_phone && (
                    <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                      {order.customer_phone}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "items",
              label: "ITEMS",
              render: (_, order) => {
                const items = Array.isArray(order.items) ? order.items : [];
                return (
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "12px", color: "#334155" }}>
                      {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                    {items.length > 0 && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {items.map((it) => it.product_name || it.name).filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                );
              },
            },
            {
              key: "payment",
              label: "PAYMENT",
              render: (_, order) => (
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                    {order.payment_method || "COD"}
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "3px",
                      padding: "1px 7px",
                      borderRadius: "6px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      background:
                        order.payment_status === "Paid" ? "#f0fdf4" : "#fffbeb",
                      color:
                        order.payment_status === "Paid" ? "#166534" : "#b45309",
                      border:
                        order.payment_status === "Paid"
                          ? "1px solid #bbf7d0"
                          : "1px solid #fde68a",
                    }}
                  >
                    {order.payment_status || "Pending"}
                  </span>
                </div>
              ),
            },
            {
              key: "total_amount",
              label: "TOTAL AMOUNT",
              sortable: true,
              render: (total) => (
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#111827" }}>
                  ₹{Number(total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              ),
            },
            {
              key: "store_payable_amount",
              label: "STORE PAYABLE / SETTLEMENT",
              sortable: true,
              render: (_, order) => {
                const gross = Number(order.store_gross_amount ?? (Number(order.subtotal || 0) + Number(order.delivery_fee || 0) + Number(order.packaging_fee || 0)));
                const comm = Number(order.admin_commission_amount || 0);
                const payable = order.store_payable_amount !== undefined
                  ? Number(order.store_payable_amount)
                  : Math.max(0, gross - comm);
                const isCod = isCodOrder(order);

                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: "14px", color: isCod ? "#0f172a" : "#15803d" }}>
                        ₹{payable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: isCod ? "#fef3c7" : "#eff6ff",
                          color: isCod ? "#92400e" : "#1d4ed8",
                          border: isCod ? "1px solid #fde68a" : "1px solid #bfdbfe",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isCod ? "Store Cash" : "Admin Payout"}
                      </span>
                      {order.is_settled_to_store ? (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "#dcfce7",
                            color: "#166534",
                            border: "1px solid #86efac",
                            whiteSpace: "nowrap",
                          }}
                          title={order.settled_at ? `Settled on ${new Date(order.settled_at).toLocaleDateString("en-IN")}` : "Settled"}
                        >
                          ✓ Settled
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "#f8fafc",
                            color: "#64748b",
                            border: "1px solid #cbd5e1",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Pending
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px", whiteSpace: "nowrap" }}>
                      Gross: ₹{gross.toFixed(0)} | Comm: -₹{comm.toFixed(0)}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "dispatch_status",
              label: "STORE DISPATCH",
              render: (_, order) => (
                order.is_forwarded_to_store ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: "#f0fdf4",
                      color: "#15803d",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    <CheckCircle2 size={12} /> Dispatched to Branch
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: "#fef3c7",
                      color: "#92400e",
                      border: "1px solid #fde68a",
                    }}
                  >
                    <Clock size={12} /> Pending Forward
                  </span>
                )
              ),
            },
            {
              key: "status",
              label: "STATUS",
              sortable: true,
              render: (status, order) => {
                const badge = getStatusBadge(status);
                return (
                  <Select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    disabled={isUpdatingStatus || order.status === "Delivered" || order.status === "Cancelled"}
                    style={{
                      padding: "3px 8px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      background: badge.bg,
                      color: badge.color,
                      borderColor: badge.border,
                      borderRadius: "8px",
                      cursor: (order.status === "Delivered" || order.status === "Cancelled") ? "default" : "pointer",
                      width: "140px",
                    }}
                  >
                    <option value="Preparing">Preparing</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </Select>
                );
              },
            },
          ]}
          data={orders}
          emptyMessage="No orders have been routed to this store yet."
          renderActions={(order) => (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Button
              variant="outline"
              size="sm"
              title="View Full Order Details"
              onClick={() => setSelectedOrderDetails(order)}
              style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              title="Chat with Customer"
              onClick={() => setActiveChatOrder(order)}
              style={{ padding: "4px 8px", fontSize: "11px", color: "#4f46e5", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
               Chat
            </Button>
          </div>
          )}
        />
        </div>

        <Pagination
          page={page}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || orders.length}
          limit={limit}
          onPageChange={setPage}
        />
      </div>

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <OrderDetailsModal
          order={selectedOrderDetails}
          onClose={() => setSelectedOrderDetails(null)}
          onRefetch={() => {
            refetchOrders();
            setSelectedOrderDetails(null);
          }}
        />
      )}

      {/* Live Order Chat Modal */}
      {activeChatOrder && (
        <AdminOrderChatModal
          order={activeChatOrder}
          onClose={() => setActiveChatOrder(null)}
        />
      )}

      {/* Store Settlement Statement PDF Modal */}
      <StoreSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        store={store}
        orders={orders}
        stats={stats}
        dateRangeLabel={dateRangeLabel}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Record Payout & Settle Orders Modal */}
      <RecordPayoutModal
        isOpen={isRecordPayoutModalOpen}
        onClose={() => setIsRecordPayoutModalOpen(false)}
        store={store}
        settlementData={settlementData}
        onSuccess={() => {
          refetchSettlementSummary();
          refetchOrders();
        }}
      />

      {/* Store Past Payouts History Modal */}
      <StorePayoutsHistoryModal
        isOpen={isPayoutHistoryModalOpen}
        onClose={() => setIsPayoutHistoryModalOpen(false)}
        store={store}
      />
    </>
  );
}


