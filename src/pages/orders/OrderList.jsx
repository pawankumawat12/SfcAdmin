import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import BulkActionBar from "../../components/common/BulkActionBar";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Pagination from "../../components/ui/Pagination";
import SearchInput from "../../components/ui/SearchInput";
import useDebouncedValue from "../../utils/useDebouncedValue";
import { exportToCsv } from "../../utils/csvExport";
import { useThrottledCallback } from "../../utils/throttle";
import toast from "react-hot-toast";
import {
  useGetAdminOrdersQuery,
  useUpdateOrderStatusMutation,
  useBulkUpdateOrderStatusMutation,
  useMarkItemProducedMutation,
  useUpdateOrderPaymentStatusMutation,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  useForwardOrderToStoreMutation,
  useGetAdminOrderByIdQuery,
} from "../../services/orderApi";
import { useGetStoresQuery, useGetMyStoreQuery } from "../../services/storeApi";
import { useGetSettingPricingQuery } from "../../services/settingsApi";
import { getAdminSocket } from "../../services/socket";
import AdminOrderChatModal from "../../components/orders/AdminOrderChatModal";
import {
  Clock,
  CheckCircle2,
  MapPin,
  Navigation,
  X,
  Eye,
  Banknote,
  QrCode,
  MessageCircle,
  Bell,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  FileText,
  Download,
  Lock,
  RotateCcw,
  Store,
  Send,
} from "lucide-react";
import OrderDetailsModal from "../../modals/OrderDetailsModal";
import RefundModal from "../../modals/RefundModal";
import { WhatsAppIcon, openWhatsAppOrderShare } from "../../utils/whatsappOrder";

export default function OrderList() {
  const location = useLocation();
  const accessToken = useSelector((state) => state.auth?.accessToken);
  const user = useSelector((state) => state.auth?.user);
  const isStoreOwner = user?.role === "store_owner";

  // Admin tab: "all" or "store"
  const [orderTab, setOrderTab] = useState("all");
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get("search") || "");
  const [refundModalOrder, setRefundModalOrder] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 600);

  useEffect(() => {
    const qSearch = new URLSearchParams(location.search).get("search");
    if (qSearch != null && qSearch !== search) {
      setSearch(qSearch);
      setPage(1);
    }
  }, [location.search]);

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [acceptModalOrder, setAcceptModalOrder] = useState(null);
  const [rejectModalOrder, setRejectModalOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState("Out of ingredients / unavailable");
  const [liveAlert, setLiveAlert] = useState(null);

  // When navigating from a notification, this holds the order ID to auto-open chat for
  const [pendingChatOrderId, setPendingChatOrderId] = useState(
    () => location.state?.openChatOrderId || null
  );

  // Admin: fetch stores for tab switcher
  const { data: storesData } = useGetStoresQuery({ limit: 100 }, { skip: isStoreOwner });
  const allStores = storesData?.stores || [];

  // Store Owner: fetch own store details to check direct dispatch permissions
  const { data: myStoreData } = useGetMyStoreQuery(undefined, { skip: !isStoreOwner });
  const myStore = myStoreData?.store;

  const {
    data: orderResponse,
    isLoading,
    error,
    refetch,
  } = useGetAdminOrdersQuery({
    page,
    limit: 10,
    status: statusFilter || undefined,
    search: debouncedSearch.trim() || undefined,
    // For admin store tab: pass storeId filter
    ...(!isStoreOwner && orderTab === "store" && selectedStoreId
      ? { storeId: selectedStoreId }
      : {}),
  });
  const { data: pricingSettingData } = useGetSettingPricingQuery();
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const [bulkUpdateStatus, { isLoading: isBulkUpdating }] = useBulkUpdateOrderStatusMutation();
  const [updatePaymentStatus, { isLoading: isUpdatingPayment }] =
    useUpdateOrderPaymentStatusMutation();
  const [acceptOrder, { isLoading: isAccepting }] = useAcceptOrderMutation();
  const [rejectOrder, { isLoading: isRejecting }] = useRejectOrderMutation();
  const [markProduced, { isLoading: isMarking }] = useMarkItemProducedMutation();
  const [forwardOrder, { isLoading: isForwarding }] = useForwardOrderToStoreMutation();

  const handleForwardToStore = async (order) => {
    try {
      const res = await forwardOrder({ id: order.id, store_id: order.store_id }).unwrap();
      toast.success(res?.message || `Order #${order.order_number || order.id} dispatched to store!`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to dispatch order to store.");
    }
  };

  const handleShareOrderToWhatsApp = (order) => {
    try {
      openWhatsAppOrderShare(order);
      toast.success("Opening WhatsApp with order details...");
    } catch (err) {
      console.error("Failed to share to WhatsApp:", err);
      toast.error("Failed to prepare WhatsApp message");
    }
  };

  // Selection & Bulk State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatusTarget, setBulkStatusTarget] = useState("Preparing");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkCancelReason, setBulkCancelReason] = useState("Cancelled by store administrator");
  const [isExportingAll, setIsExportingAll] = useState(false);

  // Fetch the specific order when a notification click brought us here
  const { data: pendingChatOrderData } = useGetAdminOrderByIdQuery(pendingChatOrderId, {
    skip: !pendingChatOrderId,
  });

  // Once the pending order data arrives, open the chat modal and clear pending state
  useEffect(() => {
    if (pendingChatOrderData?.data && pendingChatOrderId) {
      setActiveChatOrder(pendingChatOrderData.data);
      setPendingChatOrderId(null);
      // Clear the router state so navigating back/forward doesn't re-trigger
      window.history.replaceState({}, "");
    }
  }, [pendingChatOrderData, pendingChatOrderId]);

  const rawOrders = orderResponse?.data || [];
  const orders = useMemo(() => {
    if (isStoreOwner) {
      // Store owners must never see orders that were delivered or handled directly by Admin without being dispatched to the store
      return rawOrders.filter((o) => Boolean(o.is_forwarded_to_store));
    }
    return rawOrders;
  }, [rawOrders, isStoreOwner]);

  const activeOrderDetails = useMemo(() => {
    if (!selectedOrderDetails) return null;
    const found = orders?.find((o) => o.id === selectedOrderDetails.id);
    return found ? { ...selectedOrderDetails, ...found } : selectedOrderDetails;
  }, [orders, selectedOrderDetails]);

  const pagination = orderResponse?.pagination;

  // Socket.IO real-time event listeners for Admin
  useEffect(() => {
    const socket = getAdminSocket();

    const handleNewOrder = (data) => {
      setLiveAlert({
        type: "order",
        title: "New Order Received!",
        message: `Order #${data.order?.order_number || data.order?.id} from ${data.order?.customer_name} (₹${data.order?.total_amount})`,
        order: data.order,
      });
      refetch();
    };

    const handleNewMessage = (data) => {
      setLiveAlert({
        type: "message",
        title: `New Message on #${data.orderNumber}`,
        message: `${data.customerName}: "${data.message?.message?.substring(0, 50)}..."`,
        orderId: data.orderId,
      });
    };

    const handleOrderUpdated = (data) => {
      // Live silent update - refetch latest orders without noisy alert
      refetch();
      if (data?.order?.id) {
        setSelectedOrderDetails((prev) => {
          if (!prev || Number(prev.id) !== Number(data.order.id)) return prev;
          return { ...prev, ...data.order };
        });
      }
    };

    const handleOrderCancelled = (data) => {
      refetch();
      if (data?.order?.id) {
        setSelectedOrderDetails((prev) => {
          if (!prev || Number(prev.id) !== Number(data.order.id)) return prev;
          return { ...prev, ...data.order, status: "Cancelled" };
        });
      }
      setLiveAlert({
        type: "warning",
        title: `Order Cancelled: #${data.orderNumber || data.orderId}`,
        message: data.cancelReason ? `Reason: ${data.cancelReason}` : "Cancelled by customer before kitchen preparation.",
        orderId: data.orderId,
      });
    };

    socket.on("admin_new_order", handleNewOrder);
    socket.on("admin_new_message", handleNewMessage);
    socket.on("admin_order_updated", handleOrderUpdated);
    socket.on("admin_order_status_updated", handleOrderUpdated);
    socket.on("admin_order_cancelled", handleOrderCancelled);

    return () => {
      socket.off("admin_new_order", handleNewOrder);
      socket.off("admin_new_message", handleNewMessage);
      socket.off("admin_order_updated", handleOrderUpdated);
      socket.off("admin_order_status_updated", handleOrderUpdated);
      socket.off("admin_order_cancelled", handleOrderCancelled);
    };
  }, [refetch]);

  const handleStatusChange = async (orderId, newStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (order && order.status === "Cancelled") {
      alert("This order was cancelled and its status cannot be modified.");
      return;
    }
    if (
      order &&
      order.payment_method === "Online Payment" &&
      order.payment_status !== "Paid" &&
      ["Preparing", "Out for Delivery", "Delivered"].includes(newStatus)
    ) {
      alert(`Cannot set status to '${newStatus}': Online payment is still pending from customer.`);
      return;
    }
    try {
      await updateStatus({ id: orderId, status: newStatus }).unwrap();
    } catch (err) {
      console.error("Failed to update order status:", err);
      alert(err?.data?.message || err?.message || "Failed to update order status");
    }
  };

  const handlePaymentStatusChange = async (orderId, newPaymentStatus) => {
    const order = orders?.find((o) => o.id === orderId) || (selectedOrderDetails?.id === orderId ? selectedOrderDetails : null);
    if (!order) return;

    const isOnline =
      order.payment_method &&
      !order.payment_method.toLowerCase().includes("cash") &&
      !order.payment_method.toLowerCase().includes("cod");

    const currentStatus = (order.payment_status || "Pending").trim();
    const currentStatusLower = currentStatus.toLowerCase();
    const targetStatusLower = newPaymentStatus.toLowerCase();

    // RULE 1: If payment is REFUNDED, it is permanently locked
    if (currentStatusLower === "refunded") {
      toast.error("Refunded payments are permanently locked and cannot be changed.");
      return;
    }

    // If Admin selects Refund / Partially Refunded for an online order, open RefundModal!
    if (
      isOnline &&
      (targetStatusLower === "refunded" ||
        targetStatusLower === "partially refunded" ||
        targetStatusLower === "partially_refunded")
    ) {
      setRefundModalOrder(order);
      return;
    }

    // RULE 2: Online/Razorpay: If PAID, cannot change to PENDING or FAILED
    if (isOnline && currentStatusLower === "paid") {
      if (targetStatusLower === "pending" || targetStatusLower === "failed") {
        toast.error("Online payments that are already Paid cannot be changed to Pending or Failed.");
        return;
      }
    }

    // RULE 3: Partially Refunded orders cannot be set back to Pending, Failed, or Paid
    if (
      currentStatusLower === "partially refunded" ||
      currentStatusLower === "partially_refunded"
    ) {
      if (
        targetStatusLower === "pending" ||
        targetStatusLower === "failed" ||
        targetStatusLower === "paid"
      ) {
        toast.error("Partially refunded orders cannot be set back to Pending, Failed, or Paid. Please use Process Refund.");
        return;
      }
    }

    try {
      await updatePaymentStatus({ id: orderId, paymentStatus: newPaymentStatus }).unwrap();
      toast.success(`Payment status updated to ${newPaymentStatus}`);
      if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
        setSelectedOrderDetails((prev) => ({
          ...prev,
          payment_status: newPaymentStatus,
        }));
      }
    } catch (err) {
      console.error("Failed to update payment status:", err);
      toast.error(err?.data?.message || err?.message || "Failed to update payment status");
    }
  };

  const handleAcceptOrderSubmit = async () => {
    if (!acceptModalOrder) return;
    if (
      acceptModalOrder.payment_method === "Online Payment" &&
      acceptModalOrder.payment_status !== "Paid"
    ) {
      alert("Cannot accept order: Online payment is still pending from customer.");
      setAcceptModalOrder(null);
      return;
    }
    try {
      await acceptOrder({
        id: acceptModalOrder.id,
      }).unwrap();

      setAcceptModalOrder(null);
      refetch();
    } catch (err) {
      console.error("Failed to accept order:", err);
      alert(err?.data?.message || err?.message || "Failed to accept order");
    }
  };

  const handleRejectOrderSubmit = async () => {
    if (!rejectModalOrder) return;
    try {
      await rejectOrder({
        id: rejectModalOrder.id,
        cancelReason: rejectReason,
      }).unwrap();

      setRejectModalOrder(null);
      refetch();
    } catch (err) {
      console.error("Failed to reject order:", err);
    }
  };

  const handleItemProduced = async (itemId) => {
    try {
      await markProduced({ itemId, productionStatus: "PRODUCED" }).unwrap();
    } catch (err) {
      console.error("Failed to mark item produced:", err);
    }
  };

  const rows = orders.map((order) => {
    const totalItems = (order.items || []).reduce((sum, it) => sum + it.quantity, 0);
    const hasMadeToOrder = (order.items || []).some(
      (it) => it.availability_type === "MADE_TO_ORDER"
    );
    const pendingProductionItems = (order.items || []).filter(
      (it) =>
        it.availability_type === "MADE_TO_ORDER" &&
        it.production_status === "PENDING_PRODUCTION"
    );

    // Determine delivery address display
    let deliveryAddress = order.shipping_address || "";
    let parsedAddress = null;
    if (order.delivery_address_json) {
      try {
        parsedAddress =
          typeof order.delivery_address_json === "string"
            ? JSON.parse(order.delivery_address_json)
            : order.delivery_address_json;
        deliveryAddress = `${parsedAddress.house_number || ""}, ${parsedAddress.formatted_address ||
          `${parsedAddress.city || ""} - ${parsedAddress.pincode || ""}`
          }`;
      } catch { }
    }

    let parsedPricing = null;
    if (order.pricing_details_json) {
      try {
        parsedPricing =
          typeof order.pricing_details_json === "string"
            ? JSON.parse(order.pricing_details_json)
            : order.pricing_details_json;
      } catch { }
    }

    let parsedPaymentDetails = null;
    if (order.payment_details_json) {
      try {
        parsedPaymentDetails =
          typeof order.payment_details_json === "string"
            ? JSON.parse(order.payment_details_json)
            : order.payment_details_json;
      } catch { }
    }

    return {
      ...order,
      orderNumber: order.order_number || `#SFC-${order.id}`,
      customer: order.customer_name || "Customer",
      itemsSummary: `${totalItems} item(s)`,
      totalFormatted: `₹${Number(order.total_amount || 0).toLocaleString("en-IN")}`,
      createdAtFormatted: new Date(order.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      }),
      hasMadeToOrder,
      pendingProductionItems,
      deliveryAddress,
      parsedAddress,
      parsedPricing,
      parsedPaymentDetails,
    };
  });

  const orderExportColumns = [
    { key: "orderNumber", label: "Order Number" },
    { key: "customer_name", label: "Customer Name" },
    { key: "customer_email", label: "Customer Email" },
    { key: "customer_phone", label: "Customer Phone" },
    { key: "itemsSummary", label: "Items Summary" },
    { key: "subtotal", label: "Subtotal (₹)" },
    { key: "delivery_fee", label: "Delivery Fee (₹)" },
    { key: "total_amount", label: "Total Amount (₹)" },
    { key: "payment_method", label: "Payment Method" },
    { key: "payment_status", label: "Payment Status" },
    { key: "status", label: "Order Status" },
    {
      key: "created_at",
      label: "Order Date",
      getValue: (o) => (o.created_at ? new Date(o.created_at).toLocaleString() : ""),
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

  const handleBulkStatusApply = () => {
    if (selectedIds.length === 0) return;

    if (["Preparing", "Out for Delivery", "Delivered"].includes(bulkStatusTarget)) {
      const unpaidSelected = rows.filter(
        (r) =>
          selectedIds.includes(r.id) &&
          r.payment_method === "Online Payment" &&
          r.payment_status !== "Paid"
      );
      if (unpaidSelected.length === selectedIds.length) {
        toast.error(
          "All selected orders are unpaid online orders! Online payment must be completed before orders can be prepared or delivered."
        );
        return;
      }
    }

    setBulkConfirmOpen(true);
  };

  const confirmBulkStatusChange = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkUpdateStatus({
        ids: selectedIds,
        status: bulkStatusTarget,
        cancelReason: bulkStatusTarget === "Cancelled" ? bulkCancelReason : undefined,
      }).unwrap();

      if (res.skippedUnpaidOnline?.length > 0) {
        toast(
          `Updated ${res.updatedCount} order(s). ${res.skippedUnpaidOnline.length} unpaid online order(s) were protected and skipped.`,
          { icon: "⚠️", duration: 6000 }
        );
      } else {
        toast.success(res.message || `Updated ${res.updatedCount} order(s)`);
      }

      setSelectedIds([]);
      setBulkConfirmOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update order statuses");
    }
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
    exportToCsv({
      filename: `orders-selected-${new Date().toISOString().slice(0, 10)}`,
      columns: orderExportColumns,
      data: selectedRows,
    });
    toast.success(`Exported ${selectedRows.length} selected order(s) to CSV`);
  };

  const handleExportAll = async () => {
    try {
      setIsExportingAll(true);
      const queryParams = new URLSearchParams({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      });

      const response = await fetch(`/api/v1/orders/export?${queryParams.toString()}`, {
        credentials: "include",
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export orders");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Orders exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export orders CSV");
    } finally {
      setIsExportingAll(false);
    }
  };

  const throttledConfirmBulkStatusChange = useThrottledCallback(confirmBulkStatusChange, 1500);
  const throttledExportSelected = useThrottledCallback(handleExportSelected, 2000);
  const throttledExportAll = useThrottledCallback(handleExportAll, 2000);

  return (
    <>
      <div className="section-head">
        <div>
          <h1>{isStoreOwner ? "Store Orders" : "Orders"}</h1>
          <p>
            {isStoreOwner
              ? "Track, prepare, and manage fulfillment for orders dispatched to your store."
              : "Track and manage customer orders, store branch dispatch, pricing breakdowns, and kitchen fulfillment."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Button
            variant="outline"
            onClick={throttledExportAll}
            disabled={isExportingAll}
            loading={isExportingAll}
            title="Export orders matching current filters as CSV"
          >
            <Download size={16} /> Export Orders (CSV)
          </Button>
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={isStoreOwner ? "Search by order #..." : "Search by order #, customer..."}
            style={{ width: "240px" }}
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: "160px" }}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Preparing">Preparing</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      {/* Admin Tab Switcher: All Orders / Store-wise Orders */}
      {!isStoreOwner && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setOrderTab("all");
              setSelectedStoreId("");
              setPage(1);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "8px 18px",
              borderRadius: "10px",
              border: orderTab === "all" ? "1.5px solid #6253e8" : "1px solid #e5e7eb",
              background: orderTab === "all" ? "#ede9fe" : "#ffffff",
              color: orderTab === "all" ? "#4f3ef5" : "#4b5563",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <FileText size={16} />
            All Orders
            {pagination?.totalItems !== undefined && orderTab === "all" && (
              <span
                style={{
                  background: "#4f3ef5",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                }}
              >
                {pagination.totalItems}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setOrderTab("store");
              setPage(1);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "8px 18px",
              borderRadius: "10px",
              border: orderTab === "store" ? "1.5px solid #166534" : "1px solid #e5e7eb",
              background: orderTab === "store" ? "#f0fdf4" : "#ffffff",
              color: orderTab === "store" ? "#166534" : "#4b5563",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Store size={16} />
            Store-wise Orders
          </button>

          {/* Store dropdown — shown when store tab is active */}
          {orderTab === "store" && (
            <Select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value);
                setPage(1);
              }}
              style={{ minWidth: "200px", maxWidth: "280px" }}
            >
              <option value="">— Select a Store —</option>
              {allStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.city ? `• ${s.city}` : ""}
                </option>
              ))}
            </Select>
          )}

          {/* Selected store info banner */}
          {orderTab === "store" && selectedStoreId && (() => {
            const store = allStores.find((s) => String(s.id) === String(selectedStoreId));
            return store ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#166534",
                }}
              >
                <Store size={13} />
                {store.name}
                {pagination?.totalItems !== undefined && (
                  <span
                    style={{
                      background: "#166534",
                      color: "#fff",
                      borderRadius: "9999px",
                      padding: "1px 7px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {pagination.totalItems} orders
                  </span>
                )}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Store tab empty state */}
      {!isStoreOwner && orderTab === "store" && !selectedStoreId && (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            marginBottom: "20px",
          }}
        >
          <Store size={36} style={{ color: "#94a3b8", marginBottom: "12px" }} />
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
            Select a Store to View Orders
          </div>
          <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
            Use the dropdown above to filter orders by a specific branch or store location.
          </p>
        </div>
      )}


      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div className="card" style={{ padding: "16px 20px", borderLeft: "4px solid #6253e8" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#6253e8" }}>Total Orders</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827", marginTop: "4px" }}>
            {orderResponse?.stats?.totalOrders ?? pagination?.totalItems ?? orders.length}
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px", borderLeft: "4px solid #d97706" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#d97706" }}>Preparing</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#d97706", marginTop: "4px" }}>
            {orderResponse?.stats?.preparingOrders ?? orders.filter((o) => (o.status || "").toLowerCase() === "preparing").length}
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px", borderLeft: "4px solid #2563eb" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#2563eb" }}>Out for Delivery</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#2563eb", marginTop: "4px" }}>
            {orderResponse?.stats?.outForDeliveryOrders ?? orders.filter((o) => (o.status || "").toLowerCase().includes("delivery")).length}
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px", borderLeft: "4px solid #16a34a" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>Delivered</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>
            {orderResponse?.stats?.deliveredOrders ?? orders.filter((o) => (o.status || "").toLowerCase() === "delivered").length}
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px", borderLeft: "4px solid #dc2626" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626" }}>Cancelled</span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626", marginTop: "4px" }}>
            {orderResponse?.stats?.cancelledOrders ?? orders.filter((o) => (o.status || "").toLowerCase() === "cancelled").length}
          </div>
        </div>
      </div>

      {/* Live Socket.IO Notification Banner */}
      {liveAlert && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "12px",
            backgroundColor:
              liveAlert.type === "order"
                ? "#dcfce7"
                : liveAlert.type === "payment"
                  ? "#ede9fe"
                  : "#eff6ff",
            border: `1px solid ${liveAlert.type === "order"
              ? "#86efac"
              : liveAlert.type === "payment"
                ? "#c4b5fd"
                : "#bfdbfe"
              }`,
            color:
              liveAlert.type === "order"
                ? "#166534"
                : liveAlert.type === "payment"
                  ? "#5b21b6"
                  : "#1e40af",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={18} />
            <div>
              <div style={{ fontWeight: 800, fontSize: "13px" }}>{liveAlert.title}</div>
              <div style={{ fontSize: "12px" }}>{liveAlert.message}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLiveAlert(null)}
            style={{
              border: "none",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <p className="error">
          {error.data?.message || "Failed to load orders"}
        </p>
      )}

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        itemLabel="orders"
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={bulkStatusTarget}
            onChange={(e) => setBulkStatusTarget(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--color-border, #d1d5db)",
              fontSize: "13px",
              background: "#fff",
              color: "#374151",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <option value="">-- Choose Status --</option>
            <option value="Preparing">Mark as Preparing</option>
            <option value="Out for Delivery">Mark as Out for Delivery</option>
            <option value="Delivered">Mark as Delivered</option>
            <option value="Cancelled">Mark as Cancelled</option>
          </select>
          <Button
            disabled={!bulkStatusTarget || isBulkUpdating}
            loading={isBulkUpdating}
            onClick={handleBulkStatusApply}
            style={{ fontSize: "13px", padding: "6px 12px" }}
          >
            Apply Status
          </Button>
          <Button
            variant="outline"
            onClick={throttledExportSelected}
            style={{ fontSize: "13px", padding: "6px 12px" }}
          >
            <Download size={14} /> Export Selected ({selectedIds.length})
          </Button>
        </div>
      </BulkActionBar>

      <DataTable
        selectable={true}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        loading={isLoading}
        data={rows}
        emptyMessage="No orders found."
        columns={[
          {
            key: "orderNumber",
            label: "ORDER",
            render: (value, item) => (
              <div>
                <b onClick={() => setSelectedOrderDetails(item)} className="view-btn">{value}</b>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                  {item.payment_method}
                </div>
                {item.notes && item.notes.trim() && (
                  <span
                    style={{
                      marginTop: "4px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      background: "#fef3c7",
                      color: "#b45309",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                    title={`Special instructions: ${item.notes}`}
                  >
                    <FileText size={10} /> Special Note
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "customer",
            label: isStoreOwner ? "DELIVERY LOCATION" : "CUSTOMER",
            render: (value, item) => (
              <div style={{ maxWidth: "180px" }}>
                {!isStoreOwner && (
                  <>
                    <div
                      style={{
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={value}
                    >
                      {value}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--color-text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.customer_phone || item.customer_email}
                    >
                      {item.customer_phone || item.customer_email}
                    </div>
                  </>
                )}
                {item.deliveryAddress && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: "#6b7280",
                      maxWidth: "180px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={item.deliveryAddress}
                  >
                    <MapPin size={11} className="shrink-0 text-gray-400" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.deliveryAddress}</span>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "itemsSummary",
            label: "ITEMS & PRODUCTION",
            render: (value, item) => (
              <div>
                <div style={{ fontWeight: 600 }}>{value}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                  {(item.items || []).map((it) => (
                    <div
                      key={it.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11px",
                      }}
                    >
                      <span>
                        {it.quantity}x {it.product_name}
                      </span>

                    </div>
                  ))}
                </div>
                {item.notes && item.notes.trim() && (
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "5px 8px",
                      borderRadius: "6px",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      color: "#92400e",
                      fontSize: "11px",
                      lineHeight: "1.3",
                      maxWidth: "280px",
                    }}
                    title={item.notes}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700, marginBottom: "2px" }}>
                      <FileText size={11} />
                      <span>Note / Instructions:</span>
                    </div>
                    <div style={{ wordBreak: "break-word" }}>{item.notes}</div>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "totalFormatted",
            label: "PRICING & TOTAL",
            render: (value, item) => {
              const p = item.parsedPricing || {};
              const subtotal = p.subtotal ?? item.subtotal;
              const deliveryFee = p.delivery_fee ?? item.delivery_fee;
              const taxAmount = p.tax_amount ?? item.tax_amount;
              const discount = p.discount ?? item.discount;

              return (
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>
                    {value}
                  </div>
                  <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
                    Subtotal: ₹{Number(subtotal || 0).toLocaleString("en-IN")}
                  </div>
                  {Number(deliveryFee || 0) > 0 ? (
                    <div style={{ fontSize: "10px", color: "#4b5563" }}>
                      Delivery: ₹{Number(deliveryFee).toLocaleString("en-IN")}
                    </div>
                  ) : (
                    <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 600 }}>
                      Free Delivery
                    </div>
                  )}
                  {Number(discount || 0) > 0 && (
                    <div style={{ fontSize: "10px", color: "#16a34a" }}>
                      Discount: -₹{Number(discount).toLocaleString("en-IN")}
                    </div>
                  )}
                  {Number(taxAmount || 0) > 0 && (
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>
                      Tax: ₹{Number(taxAmount).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: "store_name",
            label: "BRANCH / DISPATCH",
            render: (_val, item) => {
              const hasStore = Boolean(item.store_id);
              const isForwarded = Boolean(item.is_forwarded_to_store);
              const storeTitle = item.store_name || "Direct Store";
              const isDelivered = (item.status || "").toLowerCase() === "delivered";
              const isCancelled = (item.status || "").toLowerCase() === "cancelled";

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "140px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 700, fontSize: "12px", color: "#1f2937" }}>
                    <Store size={13} style={{ color: hasStore ? "#4f46e5" : "#9ca3af", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={hasStore ? storeTitle : "Main SFC / Admin Direct"}>
                      {hasStore ? storeTitle : "Main SFC Direct"}
                    </span>
                  </div>

                  {hasStore && (
                    <div>
                      {isForwarded ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: 700,
                              backgroundColor: "#dcfce7",
                              color: "#166534",
                              border: "1px solid #bbf7d0",
                              whiteSpace: "nowrap",
                            }}
                            title={`Dispatched to store on ${item.forwarded_at ? new Date(item.forwarded_at).toLocaleString() : "Order Placement"}`}
                          >
                            <CheckCircle2 size={10} /> Dispatched to Store
                          </span>
                          {!isStoreOwner && (
                            <button
                              type="button"
                              onClick={() => handleShareOrderToWhatsApp(item)}
                              style={{
                                padding: "3px 7px",
                                fontSize: "10.5px",
                                fontWeight: 700,
                                backgroundColor: "#25D366",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                whiteSpace: "nowrap",
                                boxShadow: "0 1px 2px rgba(37, 211, 102, 0.25)",
                              }}
                              title="Re-send order details to store owner via WhatsApp"
                            >
                              <WhatsAppIcon size={12} /> WhatsApp Store
                            </button>
                          )}
                        </div>
                      ) : isDelivered ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: 700,
                            backgroundColor: "#f3f4f6",
                            color: "#4b5563",
                            border: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                          title="Delivered directly by Admin without forwarding to store"
                        >
                          <CheckCircle2 size={10} /> Delivered Directly
                        </span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: 700,
                              backgroundColor: "#fef3c7",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Clock size={10} /> Pending Dispatch
                          </span>
                          {!isStoreOwner && !isCancelled && (
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                disabled={isForwarding}
                                onClick={() => handleForwardToStore(item)}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  backgroundColor: "#4f46e5",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  whiteSpace: "nowrap",
                                  boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
                                }}
                                title="Send / dispatch this order to the store owner in system"
                              >
                                <Send size={10} /> Forward
                              </button>
                              <button
                                type="button"
                                onClick={() => handleShareOrderToWhatsApp(item)}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  backgroundColor: "#25D366",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  whiteSpace: "nowrap",
                                  boxShadow: "0 1px 2px rgba(37, 211, 102, 0.25)",
                                }}
                                title="Send order details to Store Owner via WhatsApp"
                              >
                                <WhatsAppIcon size={12} /> WhatsApp
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: "payment_status",
            label: "PAYMENT",
            render: (value, item) => {
              const isOnline =
                item.payment_method &&
                !item.payment_method.toLowerCase().includes("cash") &&
                !item.payment_method.toLowerCase().includes("cod");
              const currentStatus = item.payment_status || "Pending";
              const currentStatusLower = currentStatus.toLowerCase();

              const isRefunded = currentStatusLower === "refunded";
              const isPartiallyRefunded =
                currentStatusLower === "partially refunded" ||
                currentStatusLower === "partially_refunded";
              const isPaid = currentStatusLower === "paid";

              let statusBg = "#fef3c7";
              let statusColor = "#b45309";
              let statusBorder = "#fde68a";

              if (isPaid) {
                statusBg = "#dcfce7";
                statusColor = "#166534";
                statusBorder = "#bbf7d0";
              } else if (currentStatusLower === "failed") {
                statusBg = "#fee2e2";
                statusColor = "#b91c1c";
                statusBorder = "#fecaca";
              } else if (isRefunded) {
                statusBg = "#f1f5f9";
                statusColor = "#475569";
                statusBorder = "#cbd5e1";
              } else if (isPartiallyRefunded) {
                statusBg = "#f3e8ff";
                statusColor = "#7e22ce";
                statusBorder = "#e9d5ff";
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {isOnline ? (
                      <QrCode size={12} color="#7c3aed" />
                    ) : (
                      <Banknote size={12} color="#16a34a" />
                    )}
                    <span>{item.payment_method || "COD"}</span>
                  </div>
                  {item.transaction_id && (
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#4b5563",
                        fontFamily: "monospace",
                        backgroundColor: "#f3f4f6",
                        padding: "1px 4px",
                        borderRadius: "4px",
                        maxWidth: "135px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={`UTR/Transaction ID: ${item.transaction_id}`}
                    >
                      UTR: {item.transaction_id}
                    </div>
                  )}

                  {/* Store Owner: Completely remove Refund actions and select dropdown; show clean status badge */}
                  {isStoreOwner ? (
                    <div
                      style={{
                        fontSize: "11px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        backgroundColor: statusBg,
                        color: statusColor,
                        border: `1px solid ${statusBorder}`,
                        width: "fit-content",
                      }}
                    >
                      {currentStatus}
                    </div>
                  ) : isRefunded ? (
                    <div
                      style={{
                        fontSize: "11px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        backgroundColor: statusBg,
                        color: statusColor,
                        border: `1px solid ${statusBorder}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        width: "fit-content",
                      }}
                      title="Payment is fully refunded and permanently locked"
                    >
                      <Lock size={11} />
                      <span>Refunded</span>
                    </div>
                  ) : isPartiallyRefunded ? (
                    /* RULE 3: Partially Refunded */
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div
                        style={{
                          fontSize: "10.5px",
                          padding: "3px 6px",
                          borderRadius: "6px",
                          fontWeight: 700,
                          backgroundColor: statusBg,
                          color: statusColor,
                          border: `1px solid ${statusBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Partially Refunded
                      </div>
                      {isOnline && (
                        <button
                          type="button"
                          onClick={() => setRefundModalOrder(item)}
                          title="Process another refund via Razorpay"
                          style={{
                            padding: "3px 6px",
                            fontSize: "10px",
                            fontWeight: 700,
                            borderRadius: "6px",
                            backgroundColor: "#7e22ce",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Refund +
                        </button>
                      )}
                    </div>
                  ) : isOnline && isPaid ? (
                    /* RULE 2: Online Paid cannot change to Pending or Failed. Only Refund action */
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div
                        style={{
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontWeight: 700,
                          backgroundColor: statusBg,
                          color: statusColor,
                          border: `1px solid ${statusBorder}`,
                        }}
                      >
                        Paid
                      </div>
                      <button
                        type="button"
                        onClick={() => setRefundModalOrder(item)}
                        title="Initiate Razorpay Refund"
                        style={{
                          padding: "3px 6px",
                          fontSize: "10px",
                          fontWeight: 700,
                          borderRadius: "6px",
                          backgroundColor: "#f3e8ff",
                          color: "#7e22ce",
                          border: "1px solid #d8b4fe",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <RotateCcw size={10} />
                        <span>Refund</span>
                      </button>
                    </div>
                  ) : isOnline ? (
                    /* Online Pending or Failed */
                    <Select
                      value={currentStatus}
                      disabled={isUpdatingPayment}
                      onChange={(e) => handlePaymentStatusChange(item.id, e.target.value)}
                      style={{
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        backgroundColor: statusBg,
                        color: statusColor,
                        borderColor: statusBorder,
                        width: "135px",
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Failed">Failed</option>
                    </Select>
                  ) : (
                    /* RULE 5: COD - Keep existing management: Pending -> Paid, Paid -> Refunded */
                    <Select
                      value={currentStatus}
                      disabled={isUpdatingPayment}
                      onChange={(e) => handlePaymentStatusChange(item.id, e.target.value)}
                      style={{
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        backgroundColor: statusBg,
                        color: statusColor,
                        borderColor: statusBorder,
                        width: "135px",
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      {isPaid && <option value="Refunded">Refunded</option>}
                    </Select>
                  )}
                </div>
              );
            },
          },
          {
            key: "status",
            label: "ORDER STATUS",
            render: (value, item) => {
              const isUnpaidOnline =
                item.payment_method === "Online Payment" && item.payment_status !== "Paid";

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <Select
                    value={value}
                    disabled={isUpdating || value === "Cancelled" || (isUnpaidOnline && value === "Pending Payment")}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      fontWeight: 700,
                      width: "140px",
                      backgroundColor:
                        value === "Pending" || value === "Order Placed" || value === "Pending Payment"
                          ? "#fef3c7"
                          : value === "Accepted"
                            ? "#ecfdf5"
                            : value === "Preparing"
                              ? "#dbeafe"
                              : value === "Out for Delivery"
                                ? "#ffedd5"
                                : value === "Delivered"
                                  ? "#dcfce7"
                                  : value === "Cancelled"
                                    ? "#fee2e2"
                                    : "#ffffff",
                      color:
                        value === "Pending" || value === "Order Placed" || value === "Pending Payment"
                          ? "#b45309"
                          : value === "Accepted"
                            ? "#065f46"
                            : value === "Preparing"
                              ? "#1e40af"
                              : value === "Out for Delivery"
                                ? "#c2410c"
                                : value === "Delivered"
                                  ? "#15803d"
                                  : value === "Cancelled"
                                    ? "#b91c1c"
                                    : "#374151",
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Accepted" disabled={isUnpaidOnline}>
                      Accepted {isUnpaidOnline ? "(Requires Payment)" : ""}
                    </option>
                    <option value="Preparing" disabled={isUnpaidOnline}>
                      Preparing {isUnpaidOnline ? "(Requires Payment)" : ""}
                    </option>
                    <option value="Out for Delivery" disabled={isUnpaidOnline}>
                      Out for Delivery {isUnpaidOnline ? "(Requires Payment)" : ""}
                    </option>
                    <option value="Delivered" disabled={isUnpaidOnline}>
                      Delivered {isUnpaidOnline ? "(Requires Payment)" : ""}
                    </option>
                    <option value="Cancelled">Cancelled</option>
                  </Select>
                  {isUnpaidOnline && (
                    <span style={{ fontSize: "10px", color: "#b45309", fontWeight: 600 }}>
                      Payment Pending
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            key: "actions",
            label: "VERIFICATION & CHAT",
            render: (_val, item) => {
              const isUnpaidOnline =
                item.payment_method === "Online Payment" && item.payment_status !== "Paid";

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {(item.status === "Pending" || item.status === "Order Placed" || item.status === "Pending Payment") && (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      {isUnpaidOnline ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "4px 7px",
                            borderRadius: "6px",
                            border: "1px solid #fde68a",
                            backgroundColor: "#fef3c7",
                            color: "#92400e",
                            fontSize: "10px",
                            fontWeight: 700,
                          }}
                          title="Customer selected Online Payment but payment is not complete. Cannot accept or prepare."
                        >
                          ⚠️ Awaiting Payment
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isAccepting}
                          onClick={() => setAcceptModalOrder(item)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid #86efac",
                            backgroundColor: "#dcfce7",
                            color: "#166534",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Accept order and start food preparation"
                        >
                          <ThumbsUp size={11} /> Accept
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isRejecting}
                        onClick={() => setRejectModalOrder(item)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #fca5a5",
                          backgroundColor: "#fee2e2",
                          color: "#991b1b",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                        title={isUnpaidOnline ? "Cancel unpaid order" : "Reject order and restore stock"}
                      >
                        <ThumbsDown size={11} /> {isUnpaidOnline ? "Cancel" : "Reject"}
                      </button>
                    </div>
                  )}
                  {(() => {
                    // Chat option is only provided to store owners whose store has DIRECT ORDER DISPATCH permission (auto_forward_orders)
                    const hasDirectDispatch = Boolean(
                      myStore?.auto_forward_orders ?? item.store_auto_forward_orders
                    );
                    if (isStoreOwner && !hasDirectDispatch) {
                      return null;
                    }

                    const isChatExpired =
                      item.chatStatus?.isExpired ??
                      item.chat_status?.is_expired ??
                      ((item.status === "Delivered" || item.status === "Completed") &&
                        item.delivered_at &&
                        Date.now() >
                        new Date(item.delivered_at).getTime() + 20 * 60 * 1000);

                    return (
                      <button
                        type="button"
                        disabled={isChatExpired}
                        onClick={() => !isChatExpired && setActiveChatOrder(item)}
                        title={
                          isChatExpired
                            ? "Chat closed 20 minutes after delivery"
                            : "Open order chat"
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 7px",
                          borderRadius: "6px",
                          border: isChatExpired
                            ? "1px solid #e5e7eb"
                            : "1px solid #ddd6fe",
                          backgroundColor: isChatExpired ? "#f3f4f6" : "#f5f3ff",
                          color: isChatExpired ? "#9ca3af" : "#6d28d9",
                          fontSize: "10px",
                          fontWeight: 700,
                          width: isChatExpired ? "85px" : "75px",
                          textAlign: "center",
                          cursor: isChatExpired ? "not-allowed" : "pointer",
                          opacity: isChatExpired ? 0.65 : 1,
                        }}
                      >
                        <MessageCircle size={11} />{" "}
                        {isChatExpired ? "Expired" : "Chat"}
                      </button>
                    );
                  })()}
                </div>
              );
            },
          },
          { key: "createdAtFormatted", label: "TIME" },
          // {
          //   key: "actions",
          //   label: "ACTION",
          //   render: (_val, item) => (
          //     <button
          //       type="button"
          //       onClick={() => setSelectedOrderDetails(item)}
          //       className="view-btn"
          //     >
          //       View
          //     </button>
          //   ),
          // }
        ]}
        renderActions={(item) => {
          const addr = item.parsedAddress || item.delivery_address_json;
          let parsedAddr = null;
          try {
            parsedAddr = typeof addr === "string" ? JSON.parse(addr || "{}") : addr;
          } catch (_) { }

          const hasCoords =
            parsedAddr?.latitude != null &&
            parsedAddr?.longitude != null &&
            Number(parsedAddr.latitude) !== 0 &&
            Number(parsedAddr.longitude) !== 0;

          const destination = hasCoords
            ? `${parsedAddr.latitude},${parsedAddr.longitude}`
            : parsedAddr
              ? encodeURIComponent(
                [
                  parsedAddr.house_number,
                  parsedAddr.building_name,
                  parsedAddr.formatted_address,
                  parsedAddr.city,
                  parsedAddr.pincode,
                ]
                  .filter(Boolean)
                  .join(", ")
              )
              : item.shipping_address
                ? encodeURIComponent(item.shipping_address)
                : null;

          let pricing =
            item.parsedPricing ||
            item.pricing_details_json ||
            item.pricing_details ||
            item.pricing_breakdown;
          try {
            if (typeof pricing === "string") pricing = JSON.parse(pricing);
          } catch (_) { }

          const storeLat =
            item.store_latitude ??
            pricing?.store_latitude ??
            pricingSettingData?.data?.store_latitude;
          const storeLng =
            item.store_longitude ??
            pricing?.store_longitude ??
            pricingSettingData?.data?.store_longitude;
          const hasStoreCoords =
            storeLat != null &&
            storeLng != null &&
            Number(storeLat) !== 0 &&
            Number(storeLng) !== 0;

          const mapUrl = destination
            ? hasStoreCoords
              ? `https://www.google.com/maps/dir/?api=1&origin=${storeLat},${storeLng}&destination=${destination}&travelmode=driving`
              : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
            : null;

          return (
            <div className="d-flex align-items-center gap-1">
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-success p-1 rounded-2 d-inline-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px" }}
                  title="Deliver via Google Maps Route"
                >
                  <Navigation size={14} />
                </a>
              )}
              <Button
                variant="view"
                title="View Order Details"
                aria-label="View Order Details"
                onClick={() => setSelectedOrderDetails(item)}
              >
                <Eye size={15} />
              </Button>
            </div>
          );
        }}
      />

      <Pagination
        page={pagination?.page || page}
        totalPages={pagination?.totalPages || 1}
        total={pagination?.total || 0}
        limit={10}
        onPageChange={(p) => setPage(p)}
        itemLabel="orders"
      />



      {selectedOrderDetails && (
        <OrderDetailsModal
          order={activeOrderDetails}
          onClose={() => setSelectedOrderDetails(null)}
          onPaymentStatusChange={!isStoreOwner ? handlePaymentStatusChange : null}
          onOpenRefund={!isStoreOwner ? (order) => setRefundModalOrder(order) : null}
          isUpdatingPayment={isUpdatingPayment}
        />
      )}

      {!isStoreOwner && refundModalOrder && (
        <RefundModal
          isOpen={Boolean(refundModalOrder)}
          order={refundModalOrder}
          onClose={() => setRefundModalOrder(null)}
          onRefundSuccess={(updated) => {
            if (selectedOrderDetails?.id === updated?.id) {
              setSelectedOrderDetails(updated);
            }
          }}
        />
      )}


      {acceptModalOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => setAcceptModalOrder(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", borderRadius: "12px", backgroundColor: "#dcfce7", color: "#166534" }}>
                  <ThumbsUp size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "#111827" }}>
                    Accept & Confirm Order
                  </h3>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: "2px 0 0 0" }}>
                    Order #{acceptModalOrder.order_number || acceptModalOrder.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAcceptModalOrder(null)}
                style={{ border: "none", background: "transparent", color: "#6b7280", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: "#f9fafb", borderRadius: "12px", padding: "14px", marginBottom: "16px", fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {!isStoreOwner && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Customer</span>
                  <span style={{ fontWeight: 700 }}>{acceptModalOrder.customer_name}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Total Amount</span>
                <span style={{ fontWeight: 800, color: "#111827" }}>₹{Number(acceptModalOrder.total_amount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Payment Method</span>
                <span style={{ fontWeight: 600 }}>{acceptModalOrder.payment_method || "Cash on Delivery"}</span>
              </div>
            </div>

            <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 20px 0", lineHeight: 1.5 }}>
              Accepting this order will change its status to <strong>Preparing</strong> and notify the customer in real-time that their order has been accepted and is being prepared.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setAcceptModalOrder(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#4b5563",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAccepting}
                onClick={handleAcceptOrderSubmit}
                style={{
                  padding: "8px 20px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#166534",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: isAccepting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 6px -1px rgba(22, 101, 52, 0.2)",
                }}
              >
                <ThumbsUp size={14} />
                <span>{isAccepting ? "Accepting..." : "Confirm & Accept"}</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* REJECT ORDER MODAL */}
      {rejectModalOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => setRejectModalOrder(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", borderRadius: "12px", backgroundColor: "#fee2e2", color: "#991b1b" }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "#111827" }}>
                    Reject Order
                  </h3>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: "2px 0 0 0" }}>
                    Order #{rejectModalOrder.order_number || rejectModalOrder.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                style={{ border: "none", background: "transparent", color: "#6b7280", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                Reason for Cancellation:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  padding: "10px",
                  fontSize: "12px",
                  outline: "none",
                  fontFamily: "inherit",
                }}
                placeholder="Specify reason to be sent to customer..."
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {[
                  "Out of ingredients / unavailable",
                  "Kitchen overloaded / high demand",
                  "Address outside delivery radius",
                  "Customer unreachable",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    style={{
                      fontSize: "10px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      border: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                      color: "#4b5563",
                      cursor: "pointer",
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>



            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#4b5563",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejecting || !rejectReason.trim()}
                onClick={handleRejectOrderSubmit}
                style={{
                  padding: "8px 20px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: isRejecting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 6px -1px rgba(220, 38, 38, 0.2)",
                }}
              >
                <ThumbsDown size={14} />
                <span>{isRejecting ? "Rejecting..." : "Decline & Restore Stock"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PER-ORDER CHAT MODAL */}
      {activeChatOrder && (
        <AdminOrderChatModal
          order={activeChatOrder}
          onClose={() => setActiveChatOrder(null)}
        />
      )}

      {/* BULK STATUS CONFIRMATION DIALOG */}
      {bulkConfirmOpen && (
        <ConfirmDialog
          isOpen={bulkConfirmOpen}
          title={`Update Status of ${selectedIds.length} Order(s)`}
          message={
            <div>
              <p>
                Are you sure you want to change the status of <strong>{selectedIds.length}</strong> selected order(s) to <strong>"{bulkStatusTarget}"</strong>?
              </p>
              {bulkStatusTarget === "Cancelled" && (
                <div style={{ marginTop: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Cancellation Reason (Optional):
                  </label>
                  <textarea
                    value={bulkCancelReason}
                    onChange={(e) => setBulkCancelReason(e.target.value)}
                    placeholder="e.g. Batch cancelled due to kitchen closure or inventory unavailability"
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontSize: "13px",
                    }}
                  />
                </div>
              )}
              {["Preparing", "Out for Delivery", "Delivered"].includes(bulkStatusTarget) && (
                <p style={{ marginTop: "8px", fontSize: "12px", color: "#b45309" }}>
                  ⚠️ Notice: Unpaid online-payment orders cannot be advanced to fulfillment states and will be automatically skipped to protect order integrity.
                </p>
              )}
            </div>
          }
          confirmLabel={isBulkUpdating ? "Updating..." : "Confirm Update"}
          onConfirm={throttledConfirmBulkStatusChange}
          onCancel={() => {
            setBulkConfirmOpen(false);
            setBulkCancelReason("");
          }}
          isDestructive={bulkStatusTarget === "Cancelled"}
        />
      )}
    </>
  );
}


