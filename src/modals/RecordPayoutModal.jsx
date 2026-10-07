import React, { useState, useEffect } from "react";
import { X, CheckCircle, CreditCard, Banknote, Building2, AlertCircle, Loader2 } from "lucide-react";
import Button from "../components/ui/Button";
import { useRecordStorePayoutMutation } from "../services/storeApi";
import toast from "react-hot-toast";

export default function RecordPayoutModal({
  isOpen,
  onClose,
  store,
  settlementData,
  onSuccess,
}) {
  const [recordPayout, { isLoading }] = useRecordStorePayoutMutation();

  const currentPending = settlementData?.current_pending_payout ?? 0;
  const unsettledCount = settlementData?.unsettled_orders_count ?? 0;

  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmount(currentPending > 0 ? currentPending : 0);
      setPaymentMode("Bank Transfer");
      setPaymentReference("");
      setNotes(`Settlement payout for ${unsettledCount} completed order(s)`);
    }
  }, [isOpen, currentPending, unsettledCount]);

  if (!isOpen || !store) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid payout amount greater than ₹0.");
      return;
    }

    try {
      await recordPayout({
        storeId: store.id,
        amount: numAmount,
        paymentMode,
        paymentReference: paymentReference.trim(),
        notes: notes.trim(),
        orderIds: settlementData?.unsettled_order_ids || [],
      }).unwrap();

      toast.success(`Payout of ₹${numAmount.toLocaleString("en-IN")} successfully recorded! Orders are now marked as Settled.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to record payout.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1060,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#dcfce7",
                color: "#166534",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Banknote size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Record Store Payout & Settle
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                {store.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              color: "#64748b",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
          {/* Outstanding Banner */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: currentPending >= 0 ? "#f0fdf4" : "#fffbeb",
              border: currentPending >= 0 ? "1px solid #bbf7d0" : "1px solid #fde68a",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: currentPending >= 0 ? "#166534" : "#92400e" }}>
                Current Pending Due
              </span>
              <div style={{ fontSize: "20px", fontWeight: 900, color: currentPending >= 0 ? "#15803d" : "#b45309" }}>
                ₹{Number(Math.abs(currentPending)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Unsettled Orders</span>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>{unsettledCount} orders</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-3">
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
              Payout Amount (₹) *
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 28px",
                  fontSize: "14px",
                  fontWeight: 800,
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                }}
              />
            </div>
            <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", display: "block" }}>
              This will mark {unsettledCount} pending delivered order(s) as Settled.
            </span>
          </div>

          {/* Payment Mode & Reference Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  outline: "none",
                }}
              >
                <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                <option value="UPI">UPI / QR Payment</option>
                <option value="RTGS">RTGS</option>
                <option value="Cash">Cash Handover</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                Reference / UTR #
              </label>
              <input
                type="text"
                placeholder="e.g. UTR / UPI Ref ID"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
              Notes / Cycle Description
            </label>
            <input
              type="text"
              placeholder="e.g. Settled for September 2026 branch orders"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: "13px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                outline: "none",
              }}
            />
          </div>

          {/* Modal Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
              className="d-inline-flex align-items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Recording Payout...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={15} />
                  <span>Confirm & Settle Payout</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

