import React from "react";
import { X, History, CheckCircle, Calendar, CreditCard, Banknote, Download, Printer } from "lucide-react";
import Button from "../components/ui/Button";
import { useGetStorePayoutsQuery } from "../services/storeApi";
import toast from "react-hot-toast";

export default function StorePayoutsHistoryModal({
  isOpen,
  onClose,
  store,
}) {
  const { data: payoutsResponse, isLoading, refetch } = useGetStorePayoutsQuery(store?.id, {
    skip: !isOpen || !store?.id,
  });

  const payouts = payoutsResponse?.data || [];

  if (!isOpen || !store) return null;

  const handlePrintReceipt = (payout) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to view receipt.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payout Receipt - ${payout.payout_number}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A5; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; padding: 20px; line-height: 1.5; font-size: 13px; }
            .header { border-bottom: 2px solid #166534; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            .brand { font-size: 20px; font-weight: 900; color: #166534; margin: 0; }
            .badge { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .label { color: #64748b; font-weight: 600; }
            .value { font-weight: 700; color: #0f172a; text-align: right; }
            .total-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 14px; margin: 20px 0; text-align: center; }
            .total-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #166534; }
            .total-amount { font-size: 28px; font-weight: 900; color: #15803d; margin: 4px 0; }
            .sign { margin-top: 40px; display: flex; justify-content: space-between; }
            .sign-box { border-top: 1px dashed #cbd5e1; padding-top: 6px; min-width: 140px; font-size: 11px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">SFC BAKERS</div>
              <div style="font-size: 11px; color: #64748b;">Official Store Payout & Settlement Receipt</div>
            </div>
            <div class="badge">SETTLEMENT COMPLETED</div>
          </div>

          <div class="total-box">
            <div class="total-title">Total Payout Disbursed</div>
            <div class="total-amount">₹${Number(payout.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div style="font-size: 11px; color: #475569;">Mode: ${payout.payment_mode || "Bank Transfer"}</div>
          </div>

          <div class="row">
            <span class="label">Receipt / Payout Number</span>
            <span class="value">${payout.payout_number}</span>
          </div>
          <div class="row">
            <span class="label">Store Branch Name</span>
            <span class="value">${store.name}</span>
          </div>
          <div class="row">
            <span class="label">Store Owner</span>
            <span class="value">${store.owner_name || "Branch Partner"}</span>
          </div>
          <div class="row">
            <span class="label">Settlement Date</span>
            <span class="value">${new Date(payout.created_at).toLocaleString("en-IN")}</span>
          </div>
          <div class="row">
            <span class="label">Reference / UTR ID</span>
            <span class="value">${payout.payment_reference || "N/A"}</span>
          </div>
          <div class="row">
            <span class="label">Orders Settled</span>
            <span class="value">${payout.orders_count || 0} completed orders</span>
          </div>
          ${payout.notes ? `
          <div class="row">
            <span class="label">Settlement Remarks</span>
            <span class="value">${payout.notes}</span>
          </div>
          ` : ""}

          <div class="sign">
            <div class="sign-box">
              Store Owner Signature
            </div>
            <div class="sign-box">
              Authorized Signatory (SFC Bakers)
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
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
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                display: "grid",
                placeItems: "center",
              }}
            >
              <History size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Past Payouts & Settlement History
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                {store.name} • {payouts.length} record(s) found
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

        {/* List Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              Loading payouts history...
            </div>
          ) : payouts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              <History size={32} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
              <div style={{ fontWeight: 700, color: "#334155" }}>No Past Payouts Yet</div>
              <p style={{ fontSize: "12px", margin: "4px 0 0 0" }}>
                When Admin records a settlement payment for this branch, the receipt and transaction details will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {payouts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a" }}>
                        ₹{Number(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#166534",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "9999px",
                        }}
                      >
                        Settled
                      </span>
                    </div>

                    <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "3px" }}>
                      {new Date(p.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })} • Mode: <strong>{p.payment_mode || "Bank Transfer"}</strong>
                      {p.payment_reference && (
                        <span> • Ref: <strong>{p.payment_reference}</strong></span>
                      )}
                    </div>

                    {p.notes && (
                      <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px", fontStyle: "italic" }}>
                        "{p.notes}"
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintReceipt(p)}
                      className="d-inline-flex align-items-center gap-1.5"
                    >
                      <Printer size={13} />
                      <span>Print Receipt</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            background: "#f8fafc",
          }}
        >
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

