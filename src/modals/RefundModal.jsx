import React, { useState, useEffect } from "react";
import { X, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useRefundOrderMutation } from "../services/orderApi";
import { useThrottledCallback } from "../utils/throttle";

export default function RefundModal({ isOpen, onClose, order, onRefundSuccess }) {
  const [refundOrderApi, { isLoading }] = useRefundOrderMutation();

  const [refundType, setRefundType] = useState("full"); // "full" | "partial"
  const [customAmount, setCustomAmount] = useState("");
  const [reason, setReason] = useState("");

  const totalAmount = Number(order?.total_amount || 0);

  // Parse existing refunds from payment_details_json
  const paymentDetails =
    typeof order?.payment_details_json === "string"
      ? (() => {
          try {
            return JSON.parse(order.payment_details_json);
          } catch {
            return {};
          }
        })()
      : order?.payment_details_json || {};

  const existingRefunds = Array.isArray(paymentDetails.refunds)
    ? paymentDetails.refunds
    : [];

  const totalRefundedSoFar = existingRefunds
    .filter((r) => r.status === "processed" || !r.status || r.status === "created")
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const remainingBalance = Math.max(0, Math.round(totalAmount - totalRefundedSoFar));

  useEffect(() => {
    if (isOpen) {
      setRefundType("full");
      setCustomAmount(remainingBalance > 0 ? String(Math.round(remainingBalance)) : "0");
      setReason("");
    }
  }, [isOpen, remainingBalance]);

  const handleFullSelect = () => {
    setRefundType("full");
    setCustomAmount(String(Math.round(remainingBalance)));
  };

  const handlePartialSelect = () => {
    setRefundType("partial");
    if (Number(customAmount) >= remainingBalance) {
      setCustomAmount(String(Math.round(remainingBalance / 2)));
    }
  };

  const handlePercentage = (percent) => {
    setRefundType("partial");
    const amt = String(Math.round(remainingBalance * (percent / 100)));
    setCustomAmount(amt);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!order) return;

    const amt =
      refundType === "full"
        ? remainingBalance
        : parseFloat(customAmount || "0");

    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid refund amount greater than ₹0");
      return;
    }

    if (amt > remainingBalance + 0.01) {
      toast.error(
        `Refund amount cannot exceed remaining balance of ₹${remainingBalance.toFixed(2)}`
      );
      return;
    }

    try {
      const response = await refundOrderApi({
        id: order.id,
        amount: amt,
        reason: reason.trim() || "Admin initiated refund via Razorpay",
      }).unwrap();

      toast.success(
        response?.message || `Refund of ₹${amt.toFixed(2)} processed successfully!`
      );

      if (onRefundSuccess) {
        onRefundSuccess(response?.data || response);
      }
      onClose();
    } catch (err) {
      console.error("Refund failed:", err);
      toast.error(
        err?.data?.message || err?.message || "Failed to process refund on Razorpay"
      );
    }
  };

  const throttledSubmit = useThrottledCallback(handleSubmit, 2500);

  if (!isOpen || !order) return null;

  const isAlreadyRefunded =
    (order.payment_status || "").toLowerCase() === "refunded" ||
    remainingBalance <= 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
          animation: "fadeIn 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#faf5ff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#f3e8ff",
                color: "#7e22ce",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1f2937" }}>
                Process Razorpay Refund
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
                Order #{order.order_number || order.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              padding: "4px",
              borderRadius: "6px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px", maxHeight: "80vh", overflowY: "auto" }}>
          {isAlreadyRefunded ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                backgroundColor: "#f9fafb",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
              }}
            >
              <Lock size={32} color="#6b7280" style={{ margin: "0 auto 10px" }} />
              <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#374151" }}>
                Payment Already Fully Refunded
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                This order is permanently locked. No further refund actions can be performed.
              </p>
            </div>
          ) : (
            <form onSubmit={throttledSubmit}>
              {/* Order Summary Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>
                    ORDER TOTAL
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginTop: "2px" }}>
                    ₹{Math.round(totalAmount).toLocaleString("en-IN")}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#f0fdf4",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
                    REFUNDABLE BALANCE
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#166534", marginTop: "2px" }}>
                    ₹{Math.round(remainingBalance).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {totalRefundedSoFar > 0 && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "10px 14px",
                    backgroundColor: "#fef3c7",
                    border: "1px solid #fde68a",
                    borderRadius: "10px",
                    fontSize: "12px",
                    color: "#92400e",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertTriangle size={16} shrink={0} />
                  <span>
                    Previously Refunded: <strong>₹{Math.round(totalRefundedSoFar).toLocaleString("en-IN")}</strong> (Current status: Partially Refunded)
                  </span>
                </div>
              )}

              {/* Payment Details */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#64748b" }}>Payment Gateway:</span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>Razorpay (Online Payment)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Payment ID / UTR:</span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 600,
                      color: "#475569",
                      backgroundColor: "#f1f5f9",
                      padding: "1px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {order.transaction_id || order.razorpay_payment_id || "N/A"}
                  </span>
                </div>
              </div>

              {/* Refund Type Selector */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                  REFUND TYPE
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={handleFullSelect}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: refundType === "full" ? "2px solid #7e22ce" : "1px solid #e5e7eb",
                      backgroundColor: refundType === "full" ? "#faf5ff" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "13px", color: refundType === "full" ? "#7e22ce" : "#374151" }}>
                      Full Remaining
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      ₹{Math.round(remainingBalance)} (100%)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handlePartialSelect}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: refundType === "partial" ? "2px solid #7e22ce" : "1px solid #e5e7eb",
                      backgroundColor: refundType === "partial" ? "#faf5ff" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "13px", color: refundType === "partial" ? "#7e22ce" : "#374151" }}>
                      Partial Amount
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      Custom amount
                    </div>
                  </button>
                </div>
              </div>

              {/* Partial Amount Input & Presets */}
              {refundType === "partial" && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                    REFUND AMOUNT (₹)
                  </label>
                  <div style={{ position: "relative", marginBottom: "8px" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 700,
                        color: "#6b7280",
                      }}
                    >
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={remainingBalance}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 28px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "15px",
                        fontWeight: 700,
                        outline: "none",
                      }}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[25, 50, 75].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handlePercentage(pct)}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #e5e7eb",
                          backgroundColor: "#f9fafb",
                          cursor: "pointer",
                          color: "#4b5563",
                        }}
                      >
                        {pct}% (₹{(remainingBalance * (pct / 100)).toFixed(0)})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                  REFUND REASON
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer cancelled, items damaged, kitchen unable to prepare..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Security Warning */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  fontSize: "11.5px",
                  color: "#1e40af",
                  display: "flex",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                <ShieldCheck size={16} shrink={0} style={{ marginTop: "2px" }} />
                <span>
                  Razorpay will reverse funds back to the customer's source account. If this refund covers the full balance, payment status is permanently locked as <strong>Refunded</strong>.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#7e22ce",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  <RotateCcw size={14} className={isLoading ? "animate-spin" : ""} />
                  <span>
                    {isLoading
                      ? "Processing Refund..."
                      : `Refund ₹${refundType === "full" ? Math.round(remainingBalance) : Math.round(parseFloat(customAmount || "0"))}`}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
