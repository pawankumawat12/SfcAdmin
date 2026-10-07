import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ShoppingBag,
  Users,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  DollarSign,
  Star,
  MessageSquare,
  Flame,
  Sparkles,
  Truck,
  ChevronRight,
  Store,
  Banknote,
  Code,
  Calculator,
  X,
  FileSpreadsheet,
  Globe,
} from "lucide-react";
import toast from "react-hot-toast";
import { toAssetUrl } from "../../utils/assetUrl";
import { useGetDashboardOverviewQuery } from "../../services/dashboardApi";
import { useGetMyStoreQuery } from "../../services/storeApi";
import DataTable from "../../components/common/DataTable";
import { useShopStatus } from "../../utils/useShopStatus";
import { useThrottledCallback } from "../../utils/throttle";
import { getAdminSocket } from "../../services/socket";
import { exportToCsv } from "../../utils/csvExport";

function formatRupee(num) {
  if (num == null) return "0";
  return Number(num).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const user = useSelector((state) => state.auth.user);
  const isStoreOwner = user?.role === "store_owner";
  const { data: myStoreData } = useGetMyStoreQuery(undefined, { skip: !isStoreOwner });
  const myStore = myStoreData?.store;

  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState("weekly");
  const [activeChartMetric, setActiveChartMetric] = useState("revenue");
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showDevCalcModal, setShowDevCalcModal] = useState(false);

  const {
    data: dashboardData,
    isLoading,
    isFetching,
    refetch,
  } = useGetDashboardOverviewQuery({ timeframe });

  const throttledRefetch = useThrottledCallback(() => refetch(), 1500);

  const handleExportSalesReport = () => {
    try {
      if (recentOrders && recentOrders.length > 0) {
        const columns = [
          { key: "order_number", label: "Order Number", getValue: (r) => r.order_number || `#${r.id}` },
          { key: "created_at", label: "Date & Time", getValue: (r) => new Date(r.created_at).toLocaleString("en-IN") },
          ...(!isStoreOwner
            ? [
                { key: "customer_name", label: "Customer Name", getValue: (r) => r.customer_name || "Guest" },
                { key: "customer_phone", label: "Customer Phone", getValue: (r) => r.customer_phone || "" },
              ]
            : []),
          { key: "items_count", label: "Items", getValue: (r) => r.items_count || 1 },
          { key: "total_amount", label: "Total Amount (₹)", getValue: (r) => Number(r.total_amount || 0).toFixed(2) },
          { key: "payment_method", label: "Payment Mode", getValue: (r) => r.payment_method || "COD" },
          { key: "payment_status", label: "Payment Status", getValue: (r) => r.payment_status || "Pending" },
          { key: "status", label: "Order Status", getValue: (r) => r.status || "Completed" },
        ];

        exportToCsv({
          filename: `sales-report-${timeframe}-${new Date().toISOString().slice(0, 10)}`,
          columns,
          data: recentOrders,
        });
        toast.success(`Exported ${recentOrders.length} sales order(s) to CSV!`);
      } else {
        const summaryColumns = [
          { key: "metric", label: "KPI Metric" },
          { key: "value", label: "Value" },
        ];
        const summaryData = [
          { metric: "Selected Timeframe", value: timeframe },
          { metric: "Gross Revenue (₹)", value: kpis.totalRevenue },
          { metric: "Total Orders", value: kpis.totalOrders },
          { metric: "Average Order Value (₹)", value: avgOrderValue },
          { metric: "Delivered Orders", value: statusDistribution.delivered || 0 },
          { metric: "Pending/In-Kitchen Orders", value: (statusDistribution.preparing || 0) + (statusDistribution.out_for_delivery || 0) },
          { metric: "Cancelled Orders", value: statusDistribution.cancelled || 0 },
          { metric: "Store Commission Collected (₹)", value: kpis.totalAdminCommission },
          { metric: "Customer Platform Fee (₹)", value: kpis.totalPlatformFee },
          { metric: "Developer Tech Royalty (₹)", value: kpis.developerTotalPayout },
        ];

        exportToCsv({
          filename: `sales-summary-${timeframe}-${new Date().toISOString().slice(0, 10)}`,
          columns: summaryColumns,
          data: summaryData,
        });
        toast.success("Dashboard metrics summary exported to CSV!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to export sales report");
    }
  };

  // Silent real-time updates for dashboard KPIs and recent orders
  useEffect(() => {
    const socket = getAdminSocket();
    if (!socket) return;
    const handleUpdate = () => {
      throttledRefetch();
    };
    socket.on("admin_order_updated", handleUpdate);
    socket.on("admin_order_status_updated", handleUpdate);
    socket.on("admin_new_order", handleUpdate);
    socket.on("admin_order_cancelled", handleUpdate);

    return () => {
      socket.off("admin_order_updated", handleUpdate);
      socket.off("admin_order_status_updated", handleUpdate);
      socket.off("admin_new_order", handleUpdate);
      socket.off("admin_order_cancelled", handleUpdate);
    };
  }, [throttledRefetch]);

  const overview = dashboardData?.data || {};
  const kpis = overview.kpis || {
    totalRevenue: 0,
    totalOrders: 0,
    todaySales: 0,
    todayOrders: 0,
    yesterdaySales: 0,
    salesGrowth: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    storeNetPayable: 0,
    storeCommission: 0,
    onlineStorePayable: 0,
    codTotalAmount: 0,
    codCommission: 0,
    netStorePayout: 0,
    todayStoreEarnings: 0,
    posTotalSales: 0,
    posOrdersCount: 0,
    posTodaySales: 0,
    onlineOrdersSales: 0,
    onlineOrdersCount: 0,
    onlineTodaySales: 0,
    mainBakeryRevenue: 0,
    mainBakeryOrders: 0,
    mainBakeryTodaySales: 0,
    branchStoresRevenue: 0,
    branchStoresOrders: 0,
    branchStoresTodaySales: 0,
    totalAdminCommission: 0,
    totalStorePayable: 0,
    totalPlatformFee: 0,
    todayPlatformFee: 0,
    developerCommissionCut: 0,
    developerTotalPayout: 0,
    adminNetRetainedCommission: 0,
  };

  const trends = useMemo(() => overview.trends || [], [overview.trends]);
  const statusDistribution = overview.statusDistribution || {};
  const topProducts = overview.topProducts || [];
  const categorySales = overview.categorySales || [];
  const recentOrders = overview.recentOrders || [];
  const recentActivities = overview.recentActivities || [];

  // Trend Graph Calculations
  const chartPoints = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    const maxRevenue = Math.max(...trends.map((t) => t.revenue), 100);
    const maxOrders = Math.max(...trends.map((t) => t.orders), 10);

    return trends.map((t, idx) => {
      const x = trends.length > 1 ? (idx / (trends.length - 1)) * 520 + 40 : 300;
      const yRevenue = 200 - (t.revenue / maxRevenue) * 150;
      const yOrders = 200 - (t.orders / maxOrders) * 150;
      return {                              
        ...t,
        x,
        yRevenue,
        yOrders,
      };
    });
  }, [trends]);

  const svgPathRevenue = useMemo(() => {
    if (chartPoints.length < 2) return "";
    return chartPoints.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x},${pt.yRevenue}`;
      const prev = chartPoints[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx},${prev.yRevenue} ${cx},${pt.yRevenue} ${pt.x},${pt.yRevenue}`;
    }, "");
  }, [chartPoints]);

  const svgAreaRevenue = useMemo(() => {
    if (chartPoints.length < 2) return "";
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${svgPathRevenue} L ${last.x},210 L ${first.x},210 Z`;
  }, [svgPathRevenue, chartPoints]);

  const svgPathOrders = useMemo(() => {
    if (chartPoints.length < 2) return "";
    return chartPoints.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x},${pt.yOrders}`;
      const prev = chartPoints[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx},${prev.yOrders} ${cx},${pt.yOrders} ${pt.x},${pt.yOrders}`;
    }, "");
  }, [chartPoints]);

  const svgAreaOrders = useMemo(() => {
    if (chartPoints.length < 2) return "";
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${svgPathOrders} L ${last.x},210 L ${first.x},210 Z`;
  }, [svgPathOrders, chartPoints]);

  const chartContainerRef = useRef(null);

  // Handle touch / drag / hover interaction across the entire chart area (desktop & mobile)
  const handlePointerOrTouch = useCallback(
    (e) => {
      if (!chartPoints || chartPoints.length === 0 || !chartContainerRef.current) return;
      const rect = chartContainerRef.current.getBoundingClientRect();
      const clientX =
        e.touches && e.touches.length > 0
          ? e.touches[0].clientX
          : e.clientX;
      if (clientX == null) return;

      const relativeX = clientX - rect.left;
      const svgX = (relativeX / rect.width) * 600;

      let closest = chartPoints[0];
      let minDiff = Math.abs(chartPoints[0].x - svgX);
      for (let i = 1; i < chartPoints.length; i++) {
        const diff = Math.abs(chartPoints[i].x - svgX);
        if (diff < minDiff) {
          minDiff = diff;
          closest = chartPoints[i];
        }
      }
      setHoveredPoint(closest); 
    },
    [chartPoints]
  );

  const handlePointerLeave = useCallback((e) => {
    // Only dismiss on desktop mouse exit. On mobile touch, preserve the view so the user can read the tooltip
    if (e.pointerType === "mouse") {
      setHoveredPoint(null);
    }
  }, []);

  // Close tooltip when tapping outside the chart on mobile/tablet
  useEffect(() => {
    if (!hoveredPoint) return;
    const handleOutsideClick = (e) => {
      if (chartContainerRef.current && !chartContainerRef.current.contains(e.target)) {
        setHoveredPoint(null);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [hoveredPoint]);

  const avgOrderValue =
    kpis.totalOrders > 0 ? Math.round(kpis.totalRevenue / kpis.totalOrders) : 0;

  const totalStatusCount =
    (statusDistribution.preparing || 0) +
    (statusDistribution.out_for_delivery || 0) +
    (statusDistribution.delivered || 0) +
    (statusDistribution.cancelled || 0) || 1;

  const deliveredPercent = Math.round(
    ((statusDistribution.delivered || 0) / totalStatusCount) * 100
  );
  const pendingPercent = Math.round(
    (((statusDistribution.preparing || 0) + (statusDistribution.out_for_delivery || 0)) /
      totalStatusCount) *
      100
  );
  const cancelledPercent = Math.round(
    ((statusDistribution.cancelled || 0) / totalStatusCount) * 100
  );

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered") {
      return (
        <span
          style={{
            background: "#dcfce7",
            color: "#15803d",
            padding: "3px 8px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <CheckCircle2 size={12} /> Delivered
        </span>
      );
    }
    if (s === "out for delivery") {
      return (
        <span
          style={{
            background: "#ffedd5",
            color: "#c2410c",
            padding: "3px 8px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Truck size={12} /> Out for Delivery
        </span>
      );
    }
    if (s === "preparing") {
      return (
        <span
          style={{
            background: "#dbeafe",
            color: "#1e40af",
            padding: "3px 8px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Flame size={12} /> Preparing
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            padding: "3px 8px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <AlertTriangle size={12} /> Cancelled
        </span>
      );
    }
    return (
      <span
        style={{
          background: "#fef3c7",
          color: "#b45309",
          padding: "3px 8px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <Clock size={12} /> {status || "Pending"}
      </span>
    );
  };

  const recentOrderColumns = [
    {
      key: "orderNumber",
      label: "Order #",
      render: (val) => (
        <span
          style={{ fontWeight: 800, color: "#1f2937", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
          onClick={() => navigate("/orders")}
        >
          {val}
          {val?.startsWith("POS-") ? (
            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "#e0e7ff", color: "#4338ca", fontWeight: 700 }}>
              POS
            </span>
          ) : (
            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "#e0f2fe", color: "#0284c7", fontWeight: 700 }}>
              ONLINE
            </span>
          )}
        </span>
      ),
    },
    ...(!isStoreOwner
      ? [
          {
            key: "customerName",
            label: "Customer",
            render: (_, ord) => (
              <div onClick={() => navigate("/orders")} style={{ cursor: "pointer" }}>
                <div style={{ fontWeight: 600, color: "#374151" }}>{ord.customerName}</div>
                <div style={{ fontSize: "10px", color: "#9ca3af" }}>{ord.customerEmail}</div>
              </div>
            ),
          },
        ]
      : []),
    {
      key: "totalAmount",
      label: isStoreOwner ? "Net Payable" : "Amount",
      render: (val, ord) => (
        <div>
          <span style={{ fontWeight: 800, color: "#111827" }}>
            ₹{formatRupee(isStoreOwner && ord.storePayableAmount != null ? ord.storePayableAmount : val)}
          </span>
          {isStoreOwner && Number(ord.adminCommissionAmount || 0) > 0 && (
            <div style={{ fontSize: "10px", color: "#7e22ce", fontWeight: 600 }}>
              Comm: -₹{formatRupee(ord.adminCommissionAmount)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => getStatusBadge(val),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (val) => (
        <span style={{ color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>
          {new Date(val).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "32px" }}>
      {/* 1. TOP HEADER & TIMEFRAME BAR */}
      <div
        className="dashboard-header-card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          background: "#ffffff",
          padding: "20px 24px",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#111827" }}>
              Welcome back, {user?.name || "Admin"}! 
            </h1>
            <span
              style={{
                background: "#f0fdf4",
                color: "#16a34a",
                border: "1px solid #bbf7d0",
                fontSize: "11px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "9999px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#16a34a",
                  animation: "pulse 2s infinite",
                }}
              />
              Live Monitoring
            </span>
            {isStoreOwner && (
              <span
                style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Store size={12} /> {myStore?.name ? `Branch: ${myStore.name}` : "Store Portal"}
              </span>
            )}
          </div>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "12.5px" }}>
            {isStoreOwner
              ? "Here is your branch's real-time sales, order preparation status, and product performance."
              : "Here is your cafe's real-time financial performance, orders overview, and inventory ranking."}
          </p>
        </div>

        {/* Timeframe selector & Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", maxWidth: "100%" }}>
          <div
            style={{
              display: "flex",
              background: "#f3f4f6",
              padding: "3px",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              overflowX: "auto",
              maxWidth: "100%",
            }}
          >
            {[
              { id: "daily", label: "Today" },
              { id: "weekly", label: "7 Days" },
              { id: "monthly", label: "30 Days" },
              { id: "yearly", label: "12 Months" },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  background: timeframe === tf.id ? "#ffffff" : "transparent",
                  color: timeframe === tf.id ? "#4f7d16" : "#6b7280",
                  boxShadow: timeframe === tf.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportSalesReport}
            title="Export Sales Report to Excel / CSV"
            style={{
              height: "36px",
              padding: "0 12px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              color: "#166534",
              fontSize: "12px",
              fontWeight: 700,
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <FileSpreadsheet size={15} className="text-success" />
            <span>Export Report</span>
          </button>

          <button
            type="button"
            onClick={throttledRefetch}
            disabled={isFetching}
            title="Refresh analytics data"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "#374151",
              flexShrink: 0,
            }}
          >
            <RefreshCw size={16} className={isFetching ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* STORE OWNER BRANCH & PERMITTED CATEGORIES BANNER */}
      {isStoreOwner && (
        <div
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
            color: "#ffffff",
            padding: "20px 24px",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.15)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Store size={24} style={{ color: "#a7f3d0" }} />
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", color: "#a7f3d0", textTransform: "uppercase" }}>
                  Assigned Branch
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "2px 0 0", color: "#ffffff" }}>
                  {myStore?.name || "Your Branch Store"}
                </h2>
                {myStore?.city && (
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#d1fae5" }}>
                    {myStore.city}, {myStore.state || "Rajasthan"} {myStore.phone ? `• ${myStore.phone}` : ""}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 800,
                  background: myStore?.is_open ? "#10b981" : "#ef4444",
                  color: "#ffffff",
                }}
              >
                {myStore?.is_open ? "Store Open" : "Store Closed"}
              </span>
              <button
                type="button"
                onClick={() => navigate("/products/create")}
                style={{
                  background: "#ffffff",
                  color: "#065f46",
                  fontWeight: 700,
                  fontSize: "12px",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Package size={15} />
                Add Store Product
              </button>
            </div>
          </div>

          {/* Assigned Categories */}
          <div
            style={{
              background: "rgba(0,0,0,0.2)",
              borderRadius: "12px",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#a7f3d0" }}>
              Authorized Categories (Products can only be added within these categories):
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {Array.isArray(myStore?.assigned_categories) && myStore.assigned_categories.length > 0 ? (
                myStore.assigned_categories.map((cat) => (
                  <span
                    key={cat.id}
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      color: "#ffffff",
                      padding: "3px 10px",
                      borderRadius: "8px",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {cat.name}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "11.5px", color: "#fca5a5" }}>
                  No categories assigned yet. Please contact the administrator.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STORE SETTLEMENT & PAYOUT OVERVIEW (FOR STORE OWNERS) */}
      {isStoreOwner && (
        <div
          style={{
            background:
              (kpis.netStorePayout ?? 0) >= 0
                ? "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)"
                : "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border:
              (kpis.netStorePayout ?? 0) >= 0
                ? "1px solid #a7f3d0"
                : "1px solid #fde68a",
            borderRadius: "16px",
            padding: "20px 24px",
            marginBottom: "20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: (kpis.netStorePayout ?? 0) >= 0 ? "#065f46" : "#92400e",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Banknote size={15} />
                {(kpis.netStorePayout ?? 0) >= 0
                  ? "Net Settlement Payout (Admin to Store)"
                  : "Store Due to Admin (COD Commission Offset)"}
              </div>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 900,
                  color: (kpis.netStorePayout ?? 0) >= 0 ? "#047857" : "#b45309",
                  marginTop: "2px",
                }}
              >
                ₹{formatRupee(Math.abs(kpis.netStorePayout || 0))}
              </div>
              <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                {(kpis.netStorePayout ?? 0) >= 0 ? (
                  <span>
                    Admin will transfer{" "}
                    <strong style={{ color: "#047857" }}>
                      ₹{formatRupee(kpis.netStorePayout || 0)}
                    </strong>{" "}
                    to Store (Online Share ₹{formatRupee(kpis.onlineStorePayable || 0)} − COD Admin Comm ₹{formatRupee(kpis.codCommission || 0)})
                  </span>
                ) : (
                  <span>
                    Store collected more COD commission cash (₹{formatRupee(kpis.codCommission || 0)}) than online earnings (₹{formatRupee(kpis.onlineStorePayable || 0)}). Store owes ₹{formatRupee(Math.abs(kpis.netStorePayout || 0))}.
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Online Share */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  minWidth: "160px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
                  Online Orders Share
                </div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                  ₹{formatRupee(kpis.onlineStorePayable || 0)}
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                  Directly payable by Admin
                </div>
              </div>

              {/* POS In-Store Sales (100% Direct Cash/UPI) */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #c7d2fe",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  minWidth: "160px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#4f46e5", textTransform: "uppercase" }}>
                  POS Counter Sales
                </div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#4338ca", marginTop: "2px" }}>
                  ₹{formatRupee(kpis.posTotalSales || 0)}
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                  Direct in-store (0% Comm)
                </div>
              </div>

              {/* COD Cash in Hand */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #fde68a",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  minWidth: "160px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#b45309", textTransform: "uppercase" }}>
                  COD Cash in Hand
                </div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#b45309", marginTop: "2px" }}>
                  ₹{formatRupee(kpis.codTotalAmount || 0)}
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                  Admin Comm: -₹{formatRupee(kpis.codCommission || 0)}
                </div>
              </div>

              {/* Total Deducted Commission */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e9d5ff",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  minWidth: "160px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#7e22ce", textTransform: "uppercase" }}>
                  Admin Commission
                </div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#7e22ce", marginTop: "2px" }}>
                  -₹{formatRupee(kpis.storeCommission || 0)}
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                  Online order platform fee
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN REVENUE CHANNELS BREAKDOWN */}
      {!isStoreOwner && (
        <div
          style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "18px 22px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "14px",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#475569",
                }}
              >
                Revenue Channels Breakdown
              </span>
              <h3 style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
                Main Bakery vs Branch Outlets
              </h3>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Total Realized Sales: <strong style={{ color: "#0f172a" }}>₹{formatRupee(kpis.totalRevenue)}</strong>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {/* 1. Main Bakery (Direct) */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                  Main Bakery (Direct)
                </span>
                <span
                  style={{
                    background: "#f0fdf4",
                    color: "#16a34a",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: 700,
                  }}
                >
                  0% Comm (100% Retained)
                </span>
              </div>
              <div style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#15803d" }}>
                  ₹{formatRupee(kpis.mainBakeryRevenue || 0)}
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "3px" }}>
                  {kpis.mainBakeryOrders || 0} direct order(s) | Today: ₹{formatRupee(kpis.mainBakeryTodaySales || 0)}
                </div>
              </div>
            </div>

            {/* 2. Branch Stores (Volume) */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #bfdbfe",
                borderRadius: "12px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#1e40af", textTransform: "uppercase" }}>
                  Branch Stores Sales
                </span>
                <span
                  style={{
                    background: "#eff6ff",
                    color: "#2563eb",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: 700,
                  }}
                >
                  Online App Orders
                </span>
              </div>
              <div style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#1d4ed8" }}>
                  ₹{formatRupee(kpis.branchStoresRevenue || 0)}
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "3px" }}>
                  {kpis.branchStoresOrders || 0} online order(s) | Net Payable: ₹{formatRupee(kpis.totalStorePayable || 0)}
                </div>
              </div>
            </div>

            {/* 3. Admin Commission Earned */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e9d5ff",
                borderRadius: "12px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#7e22ce", textTransform: "uppercase" }}>
                  Admin Platform Commission
                </span>
                <span
                  style={{
                    background: "#faf5ff",
                    color: "#9333ea",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: 700,
                  }}
                >
                  Platform Revenue
                </span>
              </div>
              <div style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#7e22ce" }}>
                  ₹{formatRupee(kpis.totalAdminCommission || 0)}
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "3px" }}>
                  Net Retained: <strong>₹{formatRupee(kpis.adminNetRetainedCommission || 0)}</strong> (Dev cut: -₹{formatRupee(kpis.developerCommissionCut || 0)})
                </div>
              </div>
            </div>

            {/* 4. Developer Tech Royalty (Admin Only - Confidential) */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #bfdbfe",
                borderRadius: "12px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase" }}>
                  Developer Tech Royalty
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setShowDevCalcModal(true)}
                    style={{
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
                    title="Click to view complete calculation breakdown"
                  >
                    <Calculator size={11} />
                    <span>Show</span>
                  </button>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#2563eb",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                    }}
                  >
                    Admin Only
                  </span>
                </div>
              </div>
              <div style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#1d4ed8" }}>
                  ₹{formatRupee(kpis.developerTotalPayout || 0)}
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "3px" }}>
                  Platform Fee: ₹{formatRupee(kpis.totalPlatformFee || 0)} + Comm Share: ₹{formatRupee(kpis.developerCommissionCut || 0)}
                </div>
              </div>
            </div>

            {/* 5. Main Bakery POS Counter Sales */}
            <div
              onClick={() => navigate("/pos")}
              style={{
                background: "#ffffff",
                border: "1px solid #c7d2fe",
                borderRadius: "12px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#4338ca", textTransform: "uppercase" }}>
                  POS Counter Sales
                </span>
                <span
                  style={{
                    background: "#e0e7ff",
                    color: "#4f46e5",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: 700,
                  }}
                >
                  In-Store Counter
                </span>
              </div>
              <div style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#312e81" }}>
                  ₹{formatRupee(kpis.posTotalSales || 0)}
                </div>
                <div style={{ fontSize: "11.5px", color: "#6366f1", marginTop: "3px", fontWeight: 600 }}>
                  {kpis.posOrdersCount || 0} counter bill(s) | Today: ₹{formatRupee(kpis.posTodaySales || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DYNAMIC KPI CARDS GRID */}
      <div
        className="dashboard-kpis-grid"
        style={{
          display: "grid",
          gap: "16px",
        }}
      >
        {/* Dedicated POS Counter Sales Card (All Roles) */}
        <article
          onClick={() => navigate("/pos")}
          style={{
            background: "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: "1px solid #c7d2fe",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#4338ca" }}>
              POS Counter Sales
            </span>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#e0e7ff",
                color: "#4f46e5",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Store size={18} />
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <strong style={{ fontSize: "24px", fontWeight: 900, color: "#312e81" }}>
              ₹{formatRupee(kpis.posTotalSales || 0)}
            </strong>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11.5px", color: "#6366f1", fontWeight: 600 }}>
            {kpis.posOrdersCount || 0} counter bill(s) | Today: ₹{formatRupee(kpis.posTodaySales || 0)}
          </div>
        </article>

        {/* Dedicated Online App Orders Card (Store Owner Only) */}
        {isStoreOwner && (
          <article
            onClick={() => navigate("/orders")}
            style={{
              background: "#ffffff",
              padding: "18px 20px",
              borderRadius: "16px",
              border: "1px solid #bfdbfe",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8" }}>
                Online App Orders
              </span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "#dbeafe",
                  color: "#2563eb",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Globe size={18} />
              </div>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong style={{ fontSize: "24px", fontWeight: 900, color: "#1e3a8a" }}>
                ₹{formatRupee(kpis.onlineOrdersSales || 0)}
              </strong>
            </div>
            <div style={{ marginTop: "8px", fontSize: "11.5px", color: "#2563eb", fontWeight: 600 }}>
              {kpis.onlineOrdersCount || 0} app order(s) | Net: ₹{formatRupee(kpis.onlineStorePayable || 0)}
            </div>
          </article>
        )}
        {/* Total Revenue / Store Net Earnings */}
        <article
          style={{
            background: "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>
              {isStoreOwner ? "Store Net Earnings" : "Total Revenue"}
            </span>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#f0fdf4",
                color: "#16a34a",
                display: "grid",
                placeItems: "center",
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <strong style={{ fontSize: "24px", fontWeight: 900, color: "#111827" }}>
              ₹{formatRupee(isStoreOwner ? (kpis.storeNetPayable || 0) : kpis.totalRevenue)}
            </strong>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11.5px", color: "#6b7280" }}>
            {isStoreOwner ? (
              <span>Order Vol: ₹{formatRupee(kpis.totalRevenue)} | Comm: -₹{formatRupee(kpis.storeCommission || 0)}</span>
            ) : (
              <span>
                Main Bakery: ₹{formatRupee(kpis.mainBakeryRevenue || 0)} | POS: ₹{formatRupee(kpis.posTotalSales || 0)} | Branches: ₹{formatRupee(kpis.branchStoresRevenue || 0)}
              </span>
            )}
          </div>
        </article>

        {/* Today's Sales / Today's Net Earnings */}
        <article
          style={{
            background: "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>
              {isStoreOwner ? "Today's Net Earnings" : "Today's Sales"}
            </span>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Flame size={18} />
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <strong style={{ fontSize: "24px", fontWeight: 900, color: "#111827" }}>
              ₹{formatRupee(isStoreOwner ? (kpis.todayStoreEarnings || 0) : kpis.todaySales)}
            </strong>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11.5px", color: "#2563eb", fontWeight: 700 }}>
            {kpis.todayOrders} order(s) placed today
          </div>
        </article>

        {/* Total Orders */}
        <article
          style={{
            background: "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>Total Orders</span>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#faf5ff",
                color: "#9333ea",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ShoppingBag size={18} />
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <strong style={{ fontSize: "24px", fontWeight: 900, color: "#111827" }}>
              {kpis.totalOrders}
            </strong>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11.5px", color: "#6b7280" }}>
            Delivered: {kpis.deliveredOrders} | Cancelled: {kpis.cancelledOrders}
          </div>
        </article>

        {/* Pending Kitchen Orders */}
        <article
          onClick={() => navigate("/orders")}
          style={{
            background: kpis.pendingOrders > 0 ? "#fffbeb" : "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: kpis.pendingOrders > 0 ? "1px solid #fde68a" : "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: kpis.pendingOrders > 0 ? "#92400e" : "#6b7280",
              }}
            >
              Pending / Kitchen
            </span>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#fef3c7",
                color: "#d97706",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Clock size={18} />
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <strong
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: kpis.pendingOrders > 0 ? "#b45309" : "#111827",
              }}
            >
              {kpis.pendingOrders}
            </strong>
          </div>
          <div
            style={{
              marginTop: "8px",
              fontSize: "11.5px",
              color: "#d97706",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            Manage live queue <ChevronRight size={13} />
          </div>
        </article>

        {/* Total Customers (Only for Admin) */}
        {!isStoreOwner && (
          <article
            onClick={() => navigate("/customers")}
            style={{
              background: "#ffffff",
              padding: "18px 20px",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>Customers</span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "#f0fdfa",
                  color: "#0d9488",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Users size={18} />
              </div>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong style={{ fontSize: "24px", fontWeight: 900, color: "#111827" }}>
                {kpis.totalCustomers}
              </strong>
            </div>
            <div style={{ marginTop: "8px", fontSize: "11.5px", color: "#0d9488", fontWeight: 700 }}>
              Registered accounts
            </div>
          </article>
        )}

        {/* Total Active Menu Products */}
        <article
          onClick={() => navigate("/products")}
          style={{
            background: "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>Menu Dishes</span>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#fdf2f8",
                color: "#db2777",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Package size={18} />
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <strong style={{ fontSize: "24px", fontWeight: 900, color: "#111827" }}>
              {kpis.totalProducts}
            </strong>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11.5px", color: "#db2777", fontWeight: 700 }}>
            Active on catalog
          </div>
        </article>

        {/* Admin Commission (Only for Store Owners) */}
        {isStoreOwner && (
          <article
            style={{
              background: "#ffffff",
              padding: "18px 20px",
              borderRadius: "16px",
              border: "1px solid #e9d5ff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#7e22ce" }}>Admin Commission</span>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "#faf5ff",
                  color: "#9333ea",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Banknote size={18} />
              </div>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong style={{ fontSize: "24px", fontWeight: 900, color: "#7e22ce" }}>
                ₹{formatRupee(kpis.storeCommission || 0)}
              </strong>
            </div>
            <div style={{ marginTop: "8px", fontSize: "11.5px", color: "#6b7280" }}>
              Total platform fee deducted
            </div>
          </article>
        )}

      </div>

      {/* 3. INTERACTIVE CHARTS SECTION (2 COLUMNS) */}
      <div className="dashboard-two-col dashboard-two-col-chart" style={{ display: "grid", gap: "20px" }}>
        {/* REVENUE & ORDERS TRENDS GRAPH */}
        <div
          className="dashboard-card"
          style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
              gap: "12px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#111827" }}>
                Revenue & Orders Trends
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#6b7280" }}>
                Interactive performance metrics across {timeframe} interval
              </p>
            </div>

            {/* Metric Switcher */}
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setActiveChartMetric("revenue")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: activeChartMetric === "revenue" ? "#4f7d16" : "#e5e7eb",
                  background: activeChartMetric === "revenue" ? "#f4f8ec" : "#ffffff",
                  color: activeChartMetric === "revenue" ? "#4f7d16" : "#6b7280",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Revenue (₹)
              </button>
              <button
                type="button"
                onClick={() => setActiveChartMetric("orders")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: activeChartMetric === "orders" ? "#2563eb" : "#e5e7eb",
                  background: activeChartMetric === "orders" ? "#eff6ff" : "#ffffff",
                  color: activeChartMetric === "orders" ? "#2563eb" : "#6b7280",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Orders Count
              </button>
            </div>
          </div>

          {/* SVG Interactive Chart Canvas */}
          <div
            ref={chartContainerRef}
            style={{
              position: "relative",
              width: "100%",
              height: "230px",
              touchAction: "pan-y",
              userSelect: "none",
              WebkitUserSelect: "none",
              cursor: "crosshair",
            }}
            onPointerDown={handlePointerOrTouch}
            onPointerMove={handlePointerOrTouch}
            onPointerLeave={handlePointerLeave}
            onTouchStart={handlePointerOrTouch}
            onTouchMove={handlePointerOrTouch}
          >
            <svg
              viewBox="0 0 600 230"
              style={{ width: "100%", height: "100%", overflow: "visible" }}
            >
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f7d16" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#4f7d16" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="50" x2="560" y2="50" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="40" y1="100" x2="560" y2="100" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="40" y1="150" x2="560" y2="150" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="40" y1="200" x2="560" y2="200" stroke="#e5e7eb" strokeWidth="1.5" />

              {/* Area & Line */}
              {activeChartMetric === "revenue" ? (
                <>
                  <path d={svgAreaRevenue} fill="url(#revenueGrad)" />
                  <path
                    d={svgPathRevenue}
                    fill="none"
                    stroke="#4f7d16"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <path d={svgAreaOrders} fill="url(#ordersGrad)" />
                  <path
                    d={svgPathOrders}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Vertical Hover Guide Line & Highlight on Hover/Touch */}
              {hoveredPoint && (
                <g pointerEvents="none">
                  {/* Subtle column glow behind active point */}
                  <rect
                    x={hoveredPoint.x - 14}
                    y="35"
                    width="28"
                    height="165"
                    fill={activeChartMetric === "revenue" ? "#4f7d16" : "#2563eb"}
                    opacity="0.07"
                    rx="6"
                  />
                  {/* Vertical Guide Line */}
                  <line
                    x1={hoveredPoint.x}
                    y1="35"
                    x2={hoveredPoint.x}
                    y2="200"
                    stroke={activeChartMetric === "revenue" ? "#4f7d16" : "#2563eb"}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.85"
                  />
                  {/* Active Point Highlight Halo */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={activeChartMetric === "revenue" ? hoveredPoint.yRevenue : hoveredPoint.yOrders}
                    r="10"
                    fill={activeChartMetric === "revenue" ? "#4f7d16" : "#2563eb"}
                    opacity="0.25"
                  />
                  {/* Active Point Center Circle */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={activeChartMetric === "revenue" ? hoveredPoint.yRevenue : hoveredPoint.yOrders}
                    r="5.5"
                    fill={activeChartMetric === "revenue" ? "#4f7d16" : "#2563eb"}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                </g>
              )}

              {/* Interactive Points & Full Column Hit Areas */}
              {chartPoints.map((pt, i) => {
                const cy = activeChartMetric === "revenue" ? pt.yRevenue : pt.yOrders;
                const isHovered = hoveredPoint?.label === pt.label;
                const color = activeChartMetric === "revenue" ? "#4f7d16" : "#2563eb";
                const sliceWidth = chartPoints.length > 1 ? 520 / (chartPoints.length - 1) : 60;

                return (
                  <g key={i}>
                    {/* Generous touch/hover hit-box covering full column height for mobile & desktop */}
                    <rect
                      x={pt.x - sliceWidth / 2}
                      y="25"
                      width={sliceWidth}
                      height="185"
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onTouchStart={() => setHoveredPoint(pt)}
                      onClick={() => setHoveredPoint(pt)}
                    />

                    {/* Non-hovered point circle */}
                    {!isHovered && (
                      <circle
                        cx={pt.x}
                        cy={cy}
                        r={4}
                        fill="#ffffff"
                        stroke={color}
                        strokeWidth={2}
                        style={{ pointerEvents: "none", transition: "all 0.15s ease" }}
                      />
                    )}

                    {/* X-axis Label */}
                    <text
                      x={pt.x}
                      y="222"
                      textAnchor="middle"
                      fontSize="9.5"
                      fill={isHovered ? (activeChartMetric === "revenue" ? "#4f7d16" : "#2563eb") : "#9ca3af"}
                      fontWeight={isHovered ? "800" : "600"}
                      style={{ pointerEvents: "none", transition: "fill 0.15s ease" }}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Card (responsive & clamped for mobile) */}
            {hoveredPoint && (() => {
              const percentX = (hoveredPoint.x / 600) * 100;
              let leftStyle = `${percentX}%`;
              let transformStyle = "translateX(-50%)";
              if (percentX < 20) {
                leftStyle = "8px";
                transformStyle = "none";
              } else if (percentX > 80) {
                leftStyle = "auto";
                transformStyle = "none";
              }

              return (
                <div
                  style={{
                    position: "absolute",
                    left: leftStyle,
                    right: percentX > 80 ? "8px" : "auto",
                    top: "8px",
                    transform: transformStyle,
                    background: "#111827",
                    color: "#ffffff",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.35)",
                    pointerEvents: "none",
                    zIndex: 30,
                    whiteSpace: "nowrap",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
                      paddingBottom: "3px",
                      marginBottom: "4px",
                    }}
                  >
                    {hoveredPoint.label}
                  </div>
                  <div
                    style={{
                      color: "#4ade80",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#4ade80",
                        display: "inline-block",
                      }}
                    />
                    Revenue: ₹{formatRupee(hoveredPoint.revenue)}
                  </div>
                  <div
                    style={{
                      color: "#93c5fd",
                      fontWeight: 700,
                      marginTop: "2px",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#93c5fd",
                        display: "inline-block",
                      }}
                    />
                    Orders: {hoveredPoint.orders}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ORDER STATUS DISTRIBUTION */}
        <div
          className="dashboard-card"
          style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#111827" }}>
              Order Fulfillment
            </h2>
            <p style={{ margin: "2px 0 16px", fontSize: "11.5px", color: "#6b7280" }}>
              Status distribution across all {kpis.totalOrders} cafe orders
            </p>

            {/* Progress breakdown bar */}
            <div
              style={{
                height: "12px",
                width: "100%",
                borderRadius: "9999px",
                overflow: "hidden",
                display: "flex",
                background: "#f3f4f6",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: `${deliveredPercent}%`,
                  background: "#16a34a",
                  transition: "width 0.5s ease",
                }}
                title={`Delivered: ${deliveredPercent}%`}
              />
              <div
                style={{
                  width: `${pendingPercent}%`,
                  background: "#f59e0b",
                  transition: "width 0.5s ease",
                }}
                title={`Pending: ${pendingPercent}%`}
              />
              <div
                style={{
                  width: `${cancelledPercent}%`,
                  background: "#ef4444",
                  transition: "width 0.5s ease",
                }}
                title={`Cancelled: ${cancelledPercent}%`}
              />
            </div>

            {/* Metrics List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12.5px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#16a34a",
                    }}
                  />
                  <span style={{ fontWeight: 600, color: "#374151" }}>Delivered Successfully</span>
                </div>
                <strong style={{ color: "#111827" }}>
                  {statusDistribution.delivered || 0} ({deliveredPercent}%)
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12.5px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#f59e0b",
                    }}
                  />
                  <span style={{ fontWeight: 600, color: "#374151" }}>In Kitchen / Out</span>
                </div>
                <strong style={{ color: "#111827" }}>
                  {(statusDistribution.preparing || 0) +
                    (statusDistribution.out_for_delivery || 0)}{" "}
                  ({pendingPercent}%)
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12.5px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#ef4444",
                    }}
                  />
                  <span style={{ fontWeight: 600, color: "#374151" }}>Cancelled</span>
                </div>
                <strong style={{ color: "#111827" }}>
                  {statusDistribution.cancelled || 0} ({cancelledPercent}%)
                </strong>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "12px",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11.5px",
              color: "#64748b",
            }}
          >
            <Sparkles size={16} color="#4f7d16" />
            <span>
              <strong>{deliveredPercent}%</strong> overall delivery completion rate
            </span>
          </div>
        </div>
      </div>

      {/* 4. TOP SELLING PRODUCTS & CATEGORY SALES SECTION */}
      <div className="dashboard-two-col dashboard-two-col-products" style={{ display: "grid", gap: "20px" }}>
        {/* TOP SELLING PRODUCTS */}
        <div
          className="dashboard-card"
          style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#111827" }}>
                Top Selling Dishes
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#6b7280" }}>
                Highest volume dishes ranked by total customer orders
              </p>
            </div>
            <Link
              to="/products"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#4f7d16",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              All products <ArrowRight size={13} />
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: "12px" }}>
              No product sales data yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topProducts.map((p) => (
                <div
                  key={p.id || p.rank}
                  className="dashboard-product-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    background: "#f9fafb",
                    border: "1px solid #f3f4f6",
                  }}
                >
                  {/* Rank Badge */}
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      background: p.rank === 1 ? "#fef3c7" : "#f3f4f6",
                      color: p.rank === 1 ? "#b45309" : "#4b5563",
                      fontSize: "11px",
                      fontWeight: 800,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    #{p.rank}
                  </span>

                  {/* Thumbnail */}
                  <img
                    src={toAssetUrl(p.image)}
                    alt={p.name}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      objectFit: "cover",
                      background: "#e5e7eb",
                    }}
                  />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "13px",
                        color: "#1f2937",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                      {p.category} • ₹{formatRupee(p.price)}
                    </div>
                  </div>

                  {/* Sales Metrics */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: "13px", color: "#111827" }}>
                      {p.totalSold} sold
                    </div>
                    <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>
                      ₹{formatRupee(p.totalRevenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CATEGORY SALES DISTRIBUTION */}
        <div
          className="dashboard-card"
          style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#111827" }}>
                Category Contribution
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#6b7280" }}>
                Sales share across cafe categories
              </p>
            </div>
            <Link
              to="/categories"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#4f7d16",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              Categories <ArrowRight size={13} />
            </Link>
          </div>

          {categorySales.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: "12px" }}>
              No category sales data yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {categorySales.map((cat, i) => (
                <div key={i}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "#1f2937" }}>{cat.name}</span>
                    <span style={{ fontWeight: 800, color: "#4f7d16" }}>
                      ₹{formatRupee(cat.revenue)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      borderRadius: "9999px",
                      background: "#f3f4f6",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${cat.percentage}%`,
                        height: "100%",
                        background:
                          i === 0
                            ? "#4f7d16"
                            : i === 1
                            ? "#2563eb"
                            : i === 2
                            ? "#f59e0b"
                            : "#9333ea",
                        borderRadius: "9999px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. RECENT ORDERS & LIVE CUSTOMER ACTIVITY */}
      <div
        className="dashboard-two-col dashboard-two-col-orders"
        style={{
          display: "grid",
          gap: "20px",
          gridTemplateColumns: isStoreOwner ? "1fr" : undefined,
        }}
      >
        {/* RECENT ORDERS TABLE */}
        <div
          className="dashboard-card"
          style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#111827" }}>
                {isStoreOwner ? "Recent Store Orders" : "Recent Bakers Orders"}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#6b7280" }}>
                {isStoreOwner
                  ? "Latest dispatched orders assigned to your branch"
                  : "Latest transactions placed by customers"}
              </p>
            </div>
            <Link
              to="/orders"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#4f7d16",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              View all orders <ArrowRight size={13} />
            </Link>
          </div>

          <DataTable
            data={recentOrders}
            columns={recentOrderColumns}
            loading={isLoading || isFetching}
            emptyMessage="No orders placed yet"
          />
        </div>

        {/* LIVE CUSTOMER ACTIVITY FEED (Only for Admin) */}
        {!isStoreOwner && (
          <div
            className="dashboard-card"
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#111827" }}>
                Customer Activity Feed
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#6b7280" }}>
                Real-time events and customer engagements
              </p>
            </div>
          </div>

          {recentActivities.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: "12px" }}>
              No recent activity
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentActivities.map((act, i) => (
                <div
                  key={i}
                  className="dashboard-activity-row"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    background: "#f9fafb",
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background:
                        act.type === "order"
                          ? "#f0fdf4"
                          : act.type === "review"
                          ? "#fef3c7"
                          : "#eff6ff",
                      color:
                        act.type === "order"
                          ? "#16a34a"
                          : act.type === "review"
                          ? "#d97706"
                          : "#2563eb",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {act.type === "order" ? (
                      <ShoppingBag size={14} />
                    ) : act.type === "review" ? (
                      <Star size={14} />
                    ) : (
                      <MessageSquare size={14} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#1f2937" }}>
                      {act.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6b7280",
                        marginTop: "1px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {act.description}
                    </div>
                    <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "3px" }}>
                      {new Date(act.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

      {/* DEVELOPER TECH ROYALTY CALCULATION BREAKDOWN MODAL (ADMIN ONLY) */}
      {showDevCalcModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowDevCalcModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              maxWidth: "580px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              animation: "fadeIn 0.15s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(to right, #f8fafc, #f1f5f9)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "#eff6ff",
                      color: "#2563eb",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Calculator size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#1e293b" }}>
                    Developer Tech Royalty Calculation
                  </h3>
                </div>
                <p style={{ margin: "4px 0 0 40px", fontSize: "12px", color: "#64748b" }}>
                  Live transparent settlement breakdown & formula
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDevCalcModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "8px",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px", maxHeight: "75vh", overflowY: "auto" }}>
              {/* Grand Total Highlight */}
              <div
                style={{
                  background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                  border: "1px solid #bfdbfe",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Total Developer Realized Royalty
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: "#1d4ed8", marginTop: "2px" }}>
                    ₹{formatRupee(kpis.developerTotalPayout || 0)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#475569", fontWeight: 600 }}>Active Formula</div>
                  <div style={{ fontSize: "12.5px", color: "#1e40af", fontWeight: 800, marginTop: "2px" }}>
                    ₹{formatRupee(kpis.totalPlatformFee || 0)} + ₹{formatRupee(kpis.developerCommissionCut || 0)}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                    (Platform Fee + Comm Share)
                  </div>
                </div>
              </div>

              {/* Two Stream Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                {/* 1. Platform Fee */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "14px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    1. Customer Platform Fee
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                    ₹{formatRupee(kpis.totalPlatformFee || 0)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600, marginTop: "4px" }}>
                    100% credited to Developer
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                    Charged directly from customer per order (₹7/order) for software upkeep.
                  </div>
                </div>

                {/* 2. Admin Commission Cut */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "14px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    2. Branch Commission Cut
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                    ₹{formatRupee(kpis.developerCommissionCut || 0)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#7e22ce", fontWeight: 600, marginTop: "4px" }}>
                    25% cut of Branch Commission
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                    Taken only when orders are dispatched to branch stores.
                  </div>
                </div>
              </div>

              {/* Settlement Rules Section */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#334155", textTransform: "uppercase", marginBottom: "12px" }}>
                  Operational Accounting Rules
                </div>
                
                {/* Rule A */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", marginTop: "6px", flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: "12.5px", color: "#0f172a" }}>Main Bakery (Direct / Admin Delivered Orders):</strong>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                      Orders delivered directly by Admin without forwarding to branch: <strong>0% commission is deducted</strong>. Developer only receives the <strong>Platform Fee (₹7/order)</strong>. 100% of food revenue remains with Main Bakery.
                    </p>
                  </div>
                </div>

                {/* Rule B */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#7e22ce", marginTop: "6px", flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: "12.5px", color: "#0f172a" }}>Branch Stores (Franchise Outlets Dispatched Orders):</strong>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                      Total Branch Commission collected: <strong>₹{formatRupee(kpis.totalAdminCommission || 0)}</strong>.
                      <br />
                      • Admin Net Retained (75%): <strong>₹{formatRupee(kpis.adminNetRetainedCommission || 0)}</strong>
                      <br />
                      • Developer Royalty (25%): <strong>₹{formatRupee(kpis.developerCommissionCut || 0)}</strong>
                      <br />
                      • Store Net Payable: <strong>₹{formatRupee(kpis.totalStorePayable || 0)}</strong>
                    </p>
                  </div>
                </div>

                {/* Agreement Summary Box */}
        
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid #f1f5f9",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setShowDevCalcModal(false)}
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
