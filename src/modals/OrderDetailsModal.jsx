import { useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  X,
  Banknote,
  MapPin,
  User,
  ShoppingBag,
  Receipt,
  Truck,
  Tag,
  FileText,
  AlertTriangle,
  Download,
  LoaderCircle,
  Lock,
  RotateCcw,
  ShieldCheck,
  Navigation,
  Phone,
  ExternalLink,
  Store,
  CheckCircle2,
  Clock3,
  ChefHat,
  Package,
} from "lucide-react";
import Button from "../components/ui/Button";
import { WhatsAppIcon, openWhatsAppOrderShare } from "../utils/whatsappOrder";

const OrderDetailsModal = ({
  order,
  onClose,
  onPaymentStatusChange,
  onOpenRefund,
  isUpdatingPayment,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const accessToken = useSelector((state) => state.auth?.accessToken);

  const handleDownloadInvoice = async () => {
    if (!order?.id) return;
    try {
      setIsDownloading(true);
      const backendUrl = (
        import.meta.env?.VITE_BACKEND_URL ||
        import.meta.env?.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
        "http://localhost:3000"
      ).replace(/\/+$/, "");
      const apiUrl = backendUrl.endsWith("/api/v1") ? backendUrl : `${backendUrl}/api/v1`;

      const token =
        accessToken ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("token") ||
        "";

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiUrl}/orders/${order.id}/invoice`, {
        credentials: "include",
        headers,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Failed to download invoice");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order.order_number || order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to download invoice");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!order) return null;

  const p = order.parsedPricing || {};
  const address = order.parsedAddress || order.delivery_address_json;
  const paymentDetails = order.parsedPaymentDetails;

  const money = (value) => {
    const num = Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  };

  const number = (value) =>
    Number(value || 0).toLocaleString("en-IN");

  const subtotal = Math.round((Number(p.subtotal ?? order.subtotal ?? 0) + Number.EPSILON) * 100) / 100;
  const discount = Math.round((Number(p.discount ?? order.discount ?? 0) + Number.EPSILON) * 100) / 100;
  const discountPercent = Number(p.discount_percent ?? 0);

  const discountedSubtotal = Math.round((Number(
    p.discounted_subtotal ?? subtotal - discount
  ) + Number.EPSILON) * 100) / 100;

  const deliveryFee = Math.round((Number(
    p.delivery_fee ?? order.delivery_fee ?? 0
  ) + Number.EPSILON) * 100) / 100;

  const distanceKm =
    p.distance_km ?? order.distance_km ?? null;

  const deliveryChargeType =
    p.delivery_charge_type || "Not specified";

  const deliveryChargeValue =
    Math.round((Number(p.delivery_charge_value ?? 0) + Number.EPSILON) * 100) / 100;

  const taxAmount = Math.round((Number(
    p.tax_amount ?? order.tax_amount ?? 0
  ) + Number.EPSILON) * 100) / 100;

  const gstPercent = Number(p.gst_percent ?? 0);

  const taxInclusive =
    p.tax_inclusive ??
    order.tax_inclusive ??
    false;

  const packagingFee = Math.round((Number(
    p.packaging_fee ?? order.packaging_fee ?? 0
  ) + Number.EPSILON) * 100) / 100;

  const platformFee = Math.round((Number(
    p.platform_fee ?? order.platform_fee ?? 0
  ) + Number.EPSILON) * 100) / 100;

  const codFee = Math.round((Number(
    p.cod_fee ?? order.cod_fee ?? 0
  ) + Number.EPSILON) * 100) / 100;

  const grandTotal = Math.round((Number(
    p.grand_total ?? order.total_amount ?? 0
  ) + Number.EPSILON) * 100) / 100;

  const freeDeliveryThreshold = Number(
    p.free_delivery_threshold ?? 0
  );

  const freeDeliverySavings = Number(
    p.free_delivery_savings ?? 0
  );

  const freeDeliveryShortfall = Number(
    p.free_delivery_shortfall ?? 0
  );

  const maxDeliveryDistance = Number(
    p.max_delivery_distance ?? 0
  );

  const minimumOrderAmount = Number(
    p.minimum_order_amount ?? 0
  );

  const minimumOrderShortfall = Number(
    p.minimum_order_shortfall ?? 0
  );

  const storeLatitude = order.store_latitude ?? p.store_latitude;
  const storeLongitude = order.store_longitude ?? p.store_longitude;

  const isFreeDelivery = Boolean(p.is_free_delivery);
  const isOutOfRange = Boolean(p.is_out_of_range);
  const isBelowMinimum = Boolean(p.is_below_minimum_order);
  const isCod = Boolean(p.is_cod);

  const offer = p.applied_offer;
  const offerEvaluation = p.offer_evaluation;

  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleString("en-IN")
    : "-";

  const updatedDate = order.updated_at
    ? new Date(order.updated_at).toLocaleString("en-IN")
    : "-";

  const timelineSteps = [
    { key: "Pending", label: "Order Placed", stepNumber: 1, icon: Receipt },
    { key: "Accepted", label: "Accepted", stepNumber: 2, icon: CheckCircle2 },
    { key: "Preparing", label: "In Kitchen", stepNumber: 3, icon: ChefHat },
    { key: "Out for Delivery", label: "Out for Delivery", stepNumber: 4, icon: Truck },
    { key: "Delivered", label: "Delivered", stepNumber: 5, icon: Package },
  ];

  const getActiveStepIndex = () => {
    const s = String(order.status || "").toLowerCase().trim();
    if (s === "delivered" || s === "completed") return 5;
    if (s === "out for delivery" || s === "out_for_delivery") return 4;
    if (s === "preparing" || s === "in kitchen" || s === "cooking") return 3;
    if (s === "accepted" || s === "confirmed") return 2;
    return 1;
  };

  const currentStep = getActiveStepIndex();
  const isAccepted = currentStep >= 2;
  const isCancelled = String(order.status || "").toLowerCase() === "cancelled";

  const getDirectionsUrl = () => {
    if (!address) {
      if (!order.shipping_address) return null;
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        order.shipping_address
      )}&travelmode=driving`;
    }

    const hasCoords =
      address.latitude != null &&
      address.longitude != null &&
      Number(address.latitude) !== 0 &&
      Number(address.longitude) !== 0;

    const destination = hasCoords
      ? `${address.latitude},${address.longitude}`
      : encodeURIComponent(
          [
            address.house_number,
            address.building_name,
            address.formatted_address,
            address.city,
            address.pincode,
          ]
            .filter(Boolean)
            .join(", ")
        );

    const hasStoreCoords =
      storeLatitude != null &&
      storeLongitude != null &&
      Number(storeLatitude) !== 0 &&
      Number(storeLongitude) !== 0;

    if (hasStoreCoords) {
      return `https://www.google.com/maps/dir/?api=1&origin=${storeLatitude},${storeLongitude}&destination=${destination}&travelmode=driving`;
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  };

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
        style={{
          maxWidth: "700px",
          width: "calc(100% - 16px)",
          margin: "0.5rem auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content border-0 rounded-4 shadow">

          <div className="modal-header justify-content-between px-3 px-sm-4 py-3">

            <div>
              <h5 className="modal-title fw-bold mb-1">
                Order Details
              </h5>

              <div className="small text-muted">
                {order.orderNumber || order.order_number}
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Button
                variant="plain"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </Button>
            </div>

          </div>

          <div className="modal-body px-3 px-sm-4 py-3">

            {/* Online Payment Pending Warning */}
            {order.payment_method === "Online Payment" && order.payment_status !== "Paid" && (
              <div
                className="mb-4 p-3 rounded-3 border"
                style={{
                  backgroundColor: "#fffbeb",
                  borderColor: "#fde68a",
                }}
              >
                <div
                  className="d-flex align-items-center gap-2 mb-1"
                  style={{
                    color: "#92400e",
                    fontWeight: 800,
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>Online Payment Pending</span>
                </div>
                <div
                  style={{
                    color: "#78350f",
                    fontSize: "13px",
                    fontWeight: 500,
                    lineHeight: "1.5",
                  }}
                >
                  This customer selected Online Payment, but payment has not been received or confirmed yet. Stock has NOT been deducted, and this order must NOT be prepared or dispatched until payment is verified.
                </div>
              </div>
            )}

            {/* Live Fulfillment & Order Progression Bar */}
            <div
              className="mb-4 p-3 rounded-4 border"
              style={{
                backgroundColor: isCancelled ? "#fef2f2" : "#f8fafc",
                borderColor: isCancelled ? "#fecaca" : "#e2e8f0",
              }}
            >
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      backgroundColor: isCancelled ? "#fee2e2" : isAccepted ? "#dcfce7" : "#fef3c7",
                      color: isCancelled ? "#b91c1c" : isAccepted ? "#15803d" : "#b45309",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Store size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Fulfillment Branch
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                      {order.store_name || "Main SFC Central Kitchen"}
                    </div>
                  </div>
                </div>

                <div>
                  {isCancelled ? (
                    <span className="badge bg-danger">Cancelled</span>
                  ) : isAccepted ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 8px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <CheckCircle2 size={12} /> Accepted & Confirmed
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 8px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: "#fef3c7",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                      }}
                    >
                      <Clock3 size={12} /> Awaiting Confirmation
                    </span>
                  )}
                </div>
              </div>

              {!isCancelled && (
                <div>
                  {/* Progress Line */}
                  <div
                    style={{
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      paddingBottom: "8px",
                      marginTop: "14px",
                      scrollbarWidth: "none",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        minWidth: "310px",
                        padding: "6px 6px",
                      }}
                    >
                      {/* Connecting Bar */}
                      <div
                        style={{
                          position: "absolute",
                          top: "18px",
                          left: "20px",
                          right: "20px",
                          height: "4px",
                          backgroundColor: "#e2e8f0",
                          zIndex: 1,
                          borderRadius: "2px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${((Math.min(currentStep, 5) - 1) / 4) * 100}%`,
                            backgroundColor: "#16a34a",
                            borderRadius: "2px",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>

                      {/* Step Nodes */}
                      {timelineSteps.map((step) => {
                        const StepIcon = step.icon;
                        const isComplete = currentStep > step.stepNumber;
                        const isCurrent = currentStep === step.stepNumber;

                        let nodeBg = "#ffffff";
                        let nodeBorder = "#cbd5e1";
                        let nodeColor = "#94a3b8";

                        if (isComplete) {
                          nodeBg = "#16a34a";
                          nodeBorder = "#16a34a";
                          nodeColor = "#ffffff";
                        } else if (isCurrent) {
                          nodeBg = "#ffffff";
                          nodeBorder = "#16a34a";
                          nodeColor = "#16a34a";
                        }

                        return (
                          <div
                            key={step.key}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              zIndex: 2,
                              position: "relative",
                              width: "56px",
                              flexShrink: 0,
                            }}
                          >
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                backgroundColor: nodeBg,
                                border: `2.5px solid ${nodeBorder}`,
                                color: nodeColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: isCurrent ? "0 0 0 4px rgba(22, 163, 74, 0.18)" : "none",
                                transition: "all 0.3s ease",
                              }}
                            >
                              <StepIcon size={13} />
                            </div>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: isCurrent ? 800 : isComplete ? 700 : 500,
                                color: isCurrent ? "#16a34a" : isComplete ? "#0f172a" : "#94a3b8",
                                marginTop: "5px",
                                textAlign: "center",
                                lineHeight: 1.15,
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                display: "block",
                                width: "100%",
                              }}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ================= ORDER OVERVIEW ================= */}
            <OrderSection
              icon={<Receipt size={15} />}
              title="Order Overview"
            >

              <div className="row g-3">

                <Info
                  label="Order Number"
                  value={order.orderNumber || order.order_number}
                />

                <Info
                  label="Order ID"
                  value={`#${order.id}`}
                />

                <Info
                  label="Created At"
                  value={orderDate}
                />

               

                <Info
                  label="Order Status"
                  value={order.status}
                  badge
                />

              </div>

            </OrderSection>


            {/* ================= CUSTOMER ================= */}
            <OrderSection
              icon={<User size={15} />}
              title="Customer Information"
            >

              <div className="row g-3">

                <Info
                  label="Customer Name"
                  value={order.customer_name || order.customer}
                />

                

                <Info
                  label="Email"
                  value={order.customer_email}
                />

                <Info
                  label="Phone"
                  value={order.customer_phone}
                />

              </div>

            </OrderSection>

            {/* ================= STORE BRANCH ================= */}
            {order.store_name && (
              <OrderSection
                icon={<Store size={15} />}
                title="Assigned Store Branch"
              >
                <div className="row g-3">
                  <Info
                    label="Store Name"
                    value={order.store_name}
                  />
                  <Info
                    label="Store Phone"
                    value={order.store_phone || order.store_owner_phone || "-"}
                  />
                  {order.store_owner_name && (
                    <Info
                      label="Store Owner"
                      value={order.store_owner_name}
                    />
                  )}
                  {order.store_address && (
                    <div className="col-12">
                      <div className="small text-muted">Store Address</div>
                      <div className="small fw-semibold mt-1">{order.store_address}</div>
                    </div>
                  )}
                </div>
              </OrderSection>
            )}


            {/* ================= ITEMS ================= */}
            <OrderSection
              icon={<ShoppingBag size={15} />}
              title="Ordered Items"
            >

              <div className="border rounded-3 overflow-hidden">

                {(order.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border-bottom"
                  >

                    <div className="d-flex justify-content-between">

                      <div>

                        <div className="fw-semibold">
                          {item.product_name}
                        </div>

                        <div className="small text-muted mt-1">
                          Product ID: {item.product_id}
                        </div>

                        <div className="small mt-1">
                          {Number(item.free_quantity) > 0 ? (
                            <span>
                              {item.paid_quantity ?? item.quantity} paid + <strong className="text-success">+{item.free_quantity} free</strong> (Total: {item.quantity}) × {money(item.price)}
                            </span>
                          ) : (
                            `${item.quantity} × ${money(item.price)}`
                          )}
                        </div>

                        {Number(item.free_quantity) > 0 && (
                          <div className="mt-1">
                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                              BOGO: +{item.free_quantity} Free Item(s)
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-end">

                        <div className="small text-muted">
                          Item Total
                        </div>

                        <div className="fw-bold">
                          {money(item.total)}
                        </div>

                      </div>

                    </div>

                  </div>
                ))}

              </div>

              <div className="small text-muted mt-2">
                Total Items: {p.total_items ?? order.itemsSummary}
              </div>

            </OrderSection>


            {/* ================= ORDER NOTE / SPECIAL INSTRUCTIONS ================= */}
            {order.notes && order.notes.trim() ? (
              <div
                className="mb-4 p-3 rounded-3 border"
                style={{
                  backgroundColor: "#fffbeb",
                  borderColor: "#fde68a",
                }}
              >
                <div
                  className="d-flex align-items-center gap-2 mb-1"
                  style={{
                    color: "#92400e",
                    fontWeight: 700,
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <FileText size={15} />
                  <span>Customer Note / Special Instructions</span>
                </div>
                <div
                  style={{
                    color: "#78350f",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    whiteSpace: "pre-line",
                    lineHeight: "1.5",
                  }}
                >
                  "{order.notes.trim()}"
                </div>
              </div>
            ) : null}


            {/* ================= PRICING ================= */}
            <OrderSection
              icon={<Receipt size={15} />}
              title="Pricing Calculation"
            >

              <div className="border rounded-3 p-3">

                <PriceRow
                  label="Original Subtotal"
                  value={money(subtotal)}
                />

                {discount > 0 && (
                  <PriceRow
                    label={`Offer Discount ${
                      discountPercent
                        ? `(${discountPercent}%)`
                        : ""
                    }`}
                    value={`- ${money(discount)}`}
                    success
                  />
                )}

                <PriceRow
                  label="Discounted Subtotal"
                  value={money(discountedSubtotal)}
                />

                <hr />

                <PriceRow
                  label={
                    <>
                      Delivery Fee
                      {distanceKm != null &&
                        ` (${Number(distanceKm)})`}
                    </>
                  }
                  value={
                    deliveryFee === 0
                      ? "FREE"
                      : money(deliveryFee)
                  }
                  success={deliveryFee === 0}
                />

                {taxAmount > 0 && (
                  <PriceRow
                    label={`GST (${gstPercent}%) ${
                      taxInclusive
                        ? "Inclusive"
                        : "Added"
                    }`}
                    value={
                      taxInclusive
                        ? `${money(taxAmount)} (Included)`
                        : `+ ${money(taxAmount)}`
                    }
                  />
                )}

                {packagingFee > 0 && (
                  <PriceRow
                    label="Packaging Fee"
                    value={money(packagingFee)}
                  />
                )}

                {platformFee > 0 && (
                  <PriceRow
                    label="Platform Fee"
                    value={money(platformFee)}
                  />
                )}

                {codFee > 0 && (
                  <PriceRow
                    label="COD Handling Fee"
                    value={money(codFee)}
                  />
                )}

                <hr />

                <div className="d-flex justify-content-between fw-bold fs-5">
                  <span>Final Order Total</span>
                  <span>{money(grandTotal)}</span>
                </div>

              </div>

            </OrderSection>


            {/* ================= APPLIED OFFER ================= */}
            {offer && (
              <OrderSection
                icon={<Tag size={15} />}
                title="Applied Offer"
              >

                <div className="alert alert-success mb-0">

                  <div className="fw-bold mb-2">
                    {offer.title}
                  </div>

                  <div className="row g-2 small">

                    <Info
                      label="Offer ID"
                      value={offer.id}
                    />

                    <Info
                      label="Code"
                      value={offer.code}
                    />

                    <Info
                      label="Type"
                      value={offer.type}
                    />

                    <Info
                      label="Offer Value"
                      value={offer.discount_value}
                    />

                    <Info
                      label="Actual Discount"
                      value={money(offer.discount)}
                    />

                    <Info
                      label="Eligible"
                      value={
                        offerEvaluation?.isEligible
                          ? "Yes"
                          : "No"
                      }
                    />

                  </div>

                </div>

              </OrderSection>
            )}

            {/* ================= PAYMENT ================= */}
            <OrderSection
              icon={<Banknote size={15} />}
              title="Payment Information"
            >

              <div className="border rounded-3 p-3">

                <div className="row g-3 mb-3">

                  <Info
                    label="Payment Method"
                    value={
                      order.payment_method ||
                      "Cash on Delivery"
                    }
                  />

                  <Info
                    label="Payment Status"
                    value={order.payment_status}
                    badge
                  />

                  <Info
                    label="Transaction ID"
                    value={order.transaction_id || "N/A"}
                  />

                </div>

                {(() => {
                  const isOnline =
                    order.payment_method &&
                    !order.payment_method.toLowerCase().includes("cash") &&
                    !order.payment_method.toLowerCase().includes("cod");
                  const currentStatus = (order.payment_status || "Pending").trim();
                  const currentStatusLower = currentStatus.toLowerCase();
                  const isRefunded = currentStatusLower === "refunded";
                  const isPartiallyRefunded =
                    currentStatusLower === "partially refunded" ||
                    currentStatusLower === "partially_refunded";
                  const isPaid = currentStatusLower === "paid";

                  if (isRefunded) {
                    return (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 14px",
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          color: "#334155",
                          fontSize: "12.5px",
                        }}
                      >
                        <Lock size={15} color="#475569" />
                        <span style={{ fontWeight: 600 }}>
                          Payment is fully Refunded and is permanently locked. No further changes allowed.
                        </span>
                      </div>
                    );
                  }

                  if (isPartiallyRefunded) {
                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          backgroundColor: "#faf5ff",
                          border: "1px solid #e9d5ff",
                          borderRadius: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#7e22ce",
                          }}
                        >
                          Partially Refunded
                        </span>
                        {isOnline && onOpenRefund && (
                          <button
                            type="button"
                            onClick={() => onOpenRefund(order)}
                            style={{
                              padding: "5px 12px",
                              fontSize: "12px",
                              fontWeight: 700,
                              borderRadius: "6px",
                              backgroundColor: "#7e22ce",
                              color: "#ffffff",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <RotateCcw size={12} />
                            <span>Process Additional Refund</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (isOnline && isPaid) {
                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          backgroundColor: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#166534",
                          }}
                        >
                          Paid via Razorpay (Locked from Pending/Failed)
                        </span>
                        {onOpenRefund && (
                          <button
                            type="button"
                            onClick={() => onOpenRefund(order)}
                            style={{
                              padding: "5px 12px",
                              fontSize: "12px",
                              fontWeight: 700,
                              borderRadius: "6px",
                              backgroundColor: "#f3e8ff",
                              color: "#7e22ce",
                              border: "1px solid #d8b4fe",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <RotateCcw size={12} />
                            <span>Process Refund</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (!onPaymentStatusChange) {
                    return (
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="small text-muted">Payment Status</span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                          }}
                        >
                          {order.payment_status || "Pending"}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-muted">
                        Update Payment Status
                      </span>

                      <select
                        className="form-select form-select-sm"
                        style={{ width: "170px" }}
                        value={order.payment_status || "Pending"}
                        disabled={isUpdatingPayment}
                        onChange={(e) =>
                          onPaymentStatusChange(
                            order.id,
                            e.target.value
                          )
                        }
                      >
                        <option value="Pending">Pending</option>
                        {(!isOnline || isPaid) && <option value="Paid">Paid</option>}
                        <option value="Failed">Failed</option>
                        {!isOnline && isPaid && Boolean(onOpenRefund) && (
                          <option value="Refunded">Refunded</option>
                        )}
                      </select>
                    </div>
                  );
                })()}

              </div>

              {/* Refund History Table - Hidden from Store Owners */}
              {Boolean(onOpenRefund) && Array.isArray(paymentDetails?.refunds) && paymentDetails.refunds.length > 0 && (
                <div className="mt-3 p-3 bg-light border rounded-3">
                  <div className="fw-bold small text-dark mb-2 d-flex align-items-center gap-1">
                    <RotateCcw size={13} />
                    <span>Refund History</span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0 bg-white" style={{ fontSize: "11px" }}>
                      <thead>
                        <tr className="table-light">
                          <th>Refund ID</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Processed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentDetails.refunds.map((rfnd, idx) => (
                          <tr key={rfnd.refund_id || idx}>
                            <td className="font-monospace text-muted">{rfnd.refund_id || "N/A"}</td>
                            <td className="fw-bold text-danger">₹{Math.round(Number(rfnd.amount || 0)).toLocaleString("en-IN")}</td>
                            <td>
                              <span className="badge bg-purple text-white">
                                {rfnd.status || "processed"}
                              </span>
                            </td>
                            <td>
                              {rfnd.created_at
                                ? new Date(rfnd.created_at).toLocaleString()
                                : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </OrderSection>


            {/* ================= ADDRESS ================= */}
            <OrderSection
              icon={<MapPin size={15} />}
              title="Delivery Address Snapshot"
            >

              <div className="card border-0 bg-light rounded-3">

                <div className="card-body p-3 small">

                  {address ? (
                    <>

                      <div className="fw-bold">
                        {address.receiver_name}
                      </div>

                      <div className="text-muted mb-2">
                        {address.phone_number}
                      </div>

                      <div>
                        {address.house_number}

                        {address.building_name &&
                          `, ${address.building_name}`}

                        {address.floor &&
                          `, Floor ${address.floor}`}

                        {address.landmark &&
                          `, Near ${address.landmark}`}
                      </div>

                      <div>
                        {address.formatted_address ||
                          `${address.city}, ${address.state} - ${address.pincode}`}
                      </div>

                      <div className="text-muted mt-2">
                        City: {address.city} | State:{" "}
                        {address.state} | Pincode:{" "}
                        {address.pincode}
                      </div>

                      {/* Direction & Call Buttons */}
                      <div className="d-flex flex-wrap gap-2 mt-3 pt-3 border-top">
                        {getDirectionsUrl() && (
                          <a
                            href={getDirectionsUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-success d-inline-flex align-items-center gap-1.5 fw-bold shadow-sm"
                          >
                            <span>Deliver via Google Maps</span>
                          </a>
                        )}

                        {address.phone_number && (
                          <a
                            href={`tel:${address.phone_number.replace(/\s/g, "")}`}
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1.5 fw-semibold"
                          >
                            <Phone size={13} />
                            <span>Call Customer</span>
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        {order.shipping_address || "No address details available"}
                      </div>
                      {getDirectionsUrl() && (
                        <div className="mt-3 pt-3 border-top">
                          <a
                            href={getDirectionsUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-success d-inline-flex align-items-center gap-1.5 fw-bold shadow-sm"
                          >
                            <Navigation size={13} />
                            <span>Deliver via Google Maps</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      )}
                    </>
                  )}

                </div>

              </div>

            </OrderSection>


            {/* ================= NOTES ================= */}
            {order.notes && (
              <OrderSection title="Order Notes">

                <div className="alert alert-light border mb-0 small">
                  {order.notes}
                </div>

              </OrderSection>
            )}


            {/* ================= CANCELLATION ================= */}
            {order.cancel_reason && (
              <OrderSection title="Cancellation Information">

                <div className="alert alert-danger mb-0 small">
                  <strong>Cancel Reason:</strong>{" "}
                  {order.cancel_reason}
                </div>

              </OrderSection>
            )}

          </div>


          {/* ================= FOOTER ================= */}
          <div className="modal-footer d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 px-sm-4 py-2">
            <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={isDownloading}
                className="btn btn-outline-primary d-inline-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0"
                style={{ fontSize: "0.82rem", fontWeight: 600, padding: "6px 12px" }}
              >
                {isDownloading ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}
                {isDownloading ? "Generating..." : "Download Invoice"}
              </button>

              {order.store_id && (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      openWhatsAppOrderShare(order);
                      toast.success("Opening WhatsApp with order details...");
                    } catch (e) {
                      toast.error("Failed to open WhatsApp");
                    }
                  }}
                  className="btn d-inline-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    backgroundColor: "#25D366",
                    color: "#ffffff",
                    borderColor: "#25D366",
                    padding: "6px 12px",
                  }}
                  title="Share order details to store owner via WhatsApp"
                >
                  <WhatsAppIcon size={16} /> WhatsApp Store
                </button>
              )}
            </div>

            <Button
              variant="outline"
              onClick={onClose}
              className="w-100 w-sm-auto"
              style={{ padding: "6px 16px", fontSize: "0.82rem" }}
            >
              Close
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};


/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

const OrderSection = ({
  title,
  icon,
  children,
}) => (
  <section className="mb-4">

    <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
      {icon}
      {title}
    </h6>

    {children}

  </section>
);


const PriceRow = ({
  label,
  value,
  success = false,
}) => (
  <div className="d-flex justify-content-between align-items-center mb-2 small">

    <span
      className={
        success
          ? "text-success"
          : "text-muted"
      }
    >
      {label}
    </span>

    <span className="fw-semibold">
      {value}
    </span>

  </div>
);


const Info = ({
  label,
  value,
  badge = false,
}) => {
  const getBadgeClass = (val) => {
    const s = String(val || "").toLowerCase();
    if (s.includes("delivered") || s === "paid" || s.includes("accepted")) return "badge bg-success";
    if (s === "refunded" || s.includes("refunded")) return "badge bg-secondary";
    if (s.includes("partially")) return "badge bg-purple text-white";
    if (s.includes("preparing")) return "badge bg-primary";
    if (s.includes("out for delivery")) return "badge bg-info text-dark";
    if (s.includes("cancel") || s.includes("failed")) return "badge bg-danger";
    return "badge bg-warning text-dark";
  };

  return (
    <div className="col-12 col-sm-6">
      <div className="small text-muted">
        {label}
      </div>

      {badge ? (
        <span className={`${getBadgeClass(value)} mt-1`}>
          {value || "-"}
        </span>
      ) : (
        <div className="small fw-semibold mt-1">
          {value ?? "-"}
        </div>
      )}
    </div>
  );
};


const StatusBadge = ({
  text,
  success,
}) => (
  <span
    className={`badge ${
      success
        ? "bg-success"
        : "bg-warning text-dark"
    }`}
  >
    {text}
  </span>
);


export default OrderDetailsModal;