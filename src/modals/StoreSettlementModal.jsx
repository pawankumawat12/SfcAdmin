import React, { useRef } from "react";
import {
  X,
  Printer,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  FileSpreadsheet,
} from "lucide-react";
import Button from "../components/ui/Button";
import { exportToCsv } from "../utils/csvExport";
import toast from "react-hot-toast";

export default function StoreSettlementModal({
  isOpen,
  onClose,
  store,
  orders = [],
  stats = {},
  dateRangeLabel = "All Time",
  startDate = "",
  endDate = "",
}) {
  const printRef = useRef(null);

  if (!isOpen || !store) return null;

  const validOrders = orders.filter((o) => {
    const s = String(o.status || "").toLowerCase();
    const p = String(o.payment_status || "").toLowerCase();
    return !["cancelled", "rejected", "payment failed"].includes(s) && !["failed", "refunded"].includes(p);
  });

  const onlineOrders = validOrders.filter((o) => {
    const m = String(o.payment_method || "").toLowerCase();
    return !m.includes("cash") && !m.includes("cod");
  });

  const codOrders = validOrders.filter((o) => {
    const m = String(o.payment_method || "").toLowerCase();
    return m.includes("cash") || m.includes("cod");
  });

  const onlineOrdersCount = stats.onlineOrdersCount ?? onlineOrders.length;
  const onlineTotalAmount = stats.onlineTotalAmount ?? onlineOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const onlineStorePayable = stats.onlineStorePayable ?? onlineOrders.reduce((sum, o) => {
    const payable = o.store_payable_amount !== undefined
      ? Number(o.store_payable_amount)
      : Math.max(0, (Number(o.subtotal || 0) + Number(o.delivery_fee || 0) + Number(o.packaging_fee || 0)) - (Number(o.admin_commission_amount) || 0));
    return sum + payable;
  }, 0);
  const onlineCommission = stats.onlineCommission ?? onlineOrders.reduce((sum, o) => sum + (Number(o.admin_commission_amount) || 0), 0);

  const codOrdersCount = stats.codOrdersCount ?? codOrders.length;
  const codTotalAmount = stats.codTotalAmount ?? codOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const codCommission = stats.codCommission ?? codOrders.reduce((sum, o) => sum + (Number(o.admin_commission_amount) || 0), 0);

  const netStorePayout = stats.netStorePayout !== undefined ? stats.netStorePayout : (onlineStorePayable - codCommission);
  const totalVolume = Number(onlineTotalAmount) + Number(codTotalAmount);
  const totalCommission = Number(onlineCommission) + Number(codCommission);

  const statementNumber = `STMNT-${store.id || "001"}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // 1-Click CSV Export for this settlement
  const handleExportCsv = () => {
    const columns = [
      { key: "order_number", label: "Order Number", getValue: (r) => r.order_number || `#${r.id}` },
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
      filename: `settlement-${store.name?.replace(/\s+/g, "_") || "branch"}-${new Date().toISOString().slice(0, 10)}`,
      columns,
      data: validOrders,
    });
    toast.success("Settlement statement exported to CSV (Excel)!");
  };

  // Print / Save as PDF handler
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print / save settlement PDF.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Settlement Statement - ${store.name || "Branch"}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 12mm 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 10px;
              font-size: 12px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .brand-title {
              font-size: 22px;
              font-weight: 800;
              color: #166534;
              margin: 0;
            }
            .brand-subtitle {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }
            .statement-badge {
              text-align: right;
            }
            .statement-badge h2 {
              margin: 0;
              font-size: 16px;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .statement-badge p {
              margin: 3px 0 0 0;
              font-size: 11px;
              color: #64748b;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 14px;
            }
            .info-block h4 {
              margin: 0 0 6px 0;
              font-size: 11px;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.5px;
            }
            .info-block p {
              margin: 2px 0;
              font-size: 12px;
              color: #0f172a;
            }
            .summary-box {
              background: ${netStorePayout >= 0 ? "#f0fdf4" : "#fffbeb"};
              border: 1.5px solid ${netStorePayout >= 0 ? "#86efac" : "#fde68a"};
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 24px;
            }
            .summary-box .title {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: ${netStorePayout >= 0 ? "#166534" : "#92400e"};
            }
            .summary-box .amount {
              font-size: 26px;
              font-weight: 900;
              color: ${netStorePayout >= 0 ? "#15803d" : "#b45309"};
              margin: 4px 0;
            }
            .summary-box .detail {
              font-size: 11.5px;
              color: #334155;
            }
            .metrics-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
            }
            .metrics-table th, .metrics-table td {
              border: 1px solid #e2e8f0;
              padding: 8px 10px;
              text-align: left;
            }
            .metrics-table th {
              background: #f1f5f9;
              font-weight: 700;
              font-size: 11px;
              text-transform: uppercase;
              color: #475569;
            }
            .orders-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
              font-size: 11px;
            }
            .orders-table th, .orders-table td {
              border: 1px solid #e2e8f0;
              padding: 6px 8px;
              text-align: left;
            }
            .orders-table th {
              background: #f8fafc;
              font-weight: 700;
              color: #334155;
            }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .footer-note {
              border-top: 1px solid #e2e8f0;
              padding-top: 14px;
              margin-top: 24px;
              font-size: 10px;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .signatory {
              text-align: right;
              padding-top: 24px;
              border-top: 1px dashed #cbd5e1;
              min-width: 180px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="brand-title">SFC BAKERS</h1>
              <div class="brand-subtitle">Fresh Bakery, Cafe & Online Ordering Platform</div>
              <div style="font-size: 11px; color: #475569; margin-top: 4px;">Main Operations & Accounts Division</div>
            </div>
            <div class="statement-badge">
              <h2>Settlement Statement</h2>
              <p><strong>Statement #:</strong> ${statementNumber}</p>
              <p><strong>Generated on:</strong> ${generatedDate}</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-block">
              <h4>Branch Store Details</h4>
              <p><strong>${store.name || "Branch Store"}</strong></p>
              <p>Owner: ${store.owner_name || "N/A"}</p>
              <p>Phone: ${store.phone || "N/A"}</p>
              <p>Email: ${store.email || "N/A"}</p>
              <p>Address: ${store.address || ""}, ${store.city || ""} ${store.state || ""}</p>
            </div>
            <div class="info-block">
              <h4>Settlement Summary & Terms</h4>
              <p>Cycle Status: <strong>Ready for Bank Payout</strong></p>
              <p>Total Orders Included: <strong>${validOrders.length} orders</strong></p>
              <p>Gross Sales Processed: <strong>₹${Number(totalVolume).toFixed(2)}</strong></p>
              <p>Admin Platform Commission: <strong>₹${Number(totalCommission).toFixed(2)}</strong></p>
            </div>
          </div>

          <div class="summary-box">
            <div class="title">${netStorePayout >= 0 ? "Final Net Payout Payable to Store" : "Final Net Balance Due to Admin"}</div>
            <div class="amount">₹${Number(Math.abs(netStorePayout)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="detail">
              ${netStorePayout >= 0
                ? `Admin will transfer <strong>₹${Number(netStorePayout).toFixed(2)}</strong> to store account (Online store earnings ₹${Number(onlineStorePayable).toFixed(2)} minus COD commission deduction ₹${Number(codCommission).toFixed(2)}).`
                : `Store has collected more cash on delivery (COD Admin Commission ₹${Number(codCommission).toFixed(2)}) than online earnings (₹${Number(onlineStorePayable).toFixed(2)}). Net amount due to Admin: ₹${Number(Math.abs(netStorePayout)).toFixed(2)}.`
              }
            </div>
          </div>

          <table class="metrics-table">
            <thead>
              <tr>
                <th>Payment Mode</th>
                <th class="text-right">Orders</th>
                <th class="text-right">Gross Sales (₹)</th>
                <th class="text-right">Admin Commission (₹)</th>
                <th class="text-right">Store Net Share (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Online Prepaid Orders</strong> (Collected by Admin)</td>
                <td class="text-right">${onlineOrdersCount}</td>
                <td class="text-right">₹${Number(onlineTotalAmount).toFixed(2)}</td>
                <td class="text-right">₹${Number(onlineCommission).toFixed(2)}</td>
                <td class="text-right font-bold" style="color: #16a34a;">₹${Number(onlineStorePayable).toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Cash on Delivery (COD)</strong> (Cash with Store)</td>
                <td class="text-right">${codOrdersCount}</td>
                <td class="text-right">₹${Number(codTotalAmount).toFixed(2)}</td>
                <td class="text-right font-bold" style="color: #dc2626;">-₹${Number(codCommission).toFixed(2)}</td>
                <td class="text-right">Retained as Cash</td>
              </tr>
              <tr style="background: #f8fafc; font-weight: 700;">
                <td>TOTAL SETTLEMENT</td>
                <td class="text-right">${validOrders.length}</td>
                <td class="text-right">₹${Number(totalVolume).toFixed(2)}</td>
                <td class="text-right">₹${Number(totalCommission).toFixed(2)}</td>
                <td class="text-right font-bold" style="color: ${netStorePayout >= 0 ? '#166534' : '#b45309'}; font-size: 13px;">
                  ₹${Number(netStorePayout).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          <h3 style="font-size: 13px; margin: 16px 0 8px 0; color: #0f172a;">Itemized Order Ledger (${validOrders.length} Orders)</h3>
          <table class="orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment</th>
                <th class="text-right">Amount (₹)</th>
                <th class="text-right">Comm (₹)</th>
                <th class="text-right">Store Net (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${validOrders.map((o) => `
                <tr>
                  <td><strong>${o.order_number || '#' + o.id}</strong></td>
                  <td>${new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                  <td>${o.customer_name || "Customer"}</td>
                  <td>${o.payment_method || "COD"}</td>
                  <td class="text-right">₹${Number(o.total_amount || 0).toFixed(2)}</td>
                  <td class="text-right">₹${Number(o.admin_commission_amount || 0).toFixed(2)}</td>
                  <td class="text-right font-bold">₹${Number(o.store_payable_amount || 0).toFixed(2)}</td>
                  <td>${o.status || "Completed"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer-note">
            <div>
              <p>This is a computer-generated settlement invoice statement for internal branch accounting.</p>
              <p>SFC Bakers • support@sfcbakers.com • Powered by SFC Enterprise Bakery Platform</p>
            </div>
            <div class="signatory">
              <div style="font-size: 11px; font-weight: 700; color: #1e293b;">Authorized Signatory</div>
              <div style="font-size: 10px; color: #64748b;">SFC Accounts Dept.</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
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
        zIndex: 1050,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "880px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
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
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Store Settlement Statement & Invoice
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                {store.name} • Period: <strong style={{ color: "#0f172a" }}>{dateRangeLabel}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              title="Download Excel / CSV"
              className="d-inline-flex align-items-center gap-1.5"
            >
              <FileSpreadsheet size={14} className="text-success" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              title="Print or Save as PDF"
              className="d-inline-flex align-items-center gap-1.5"
            >
              <Printer size={14} />
              <span>Print / Download PDF</span>
            </Button>
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
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }} ref={printRef}>
          {/* Statement Meta Card */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              padding: "14px 16px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              marginBottom: "16px",
              fontSize: "12px",
            }}
          >
            <div>
              <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                Statement Number
              </span>
              <div style={{ fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{statementNumber}</div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                Settlement Period
              </span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{dateRangeLabel}</div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                Branch Owner
              </span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                {store.owner_name || "N/A"} ({store.phone || ""})
              </div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                Delivered Orders
              </span>
              <div style={{ fontWeight: 800, color: "#166534", marginTop: "2px" }}>
                {validOrders.length} Completed
              </div>
            </div>
          </div>

          {/* Highlight Payout Callout */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "12px",
              background: netStorePayout >= 0 ? "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)" : "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
              border: netStorePayout >= 0 ? "1px solid #86efac" : "1px solid #fde68a",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: netStorePayout >= 0 ? "#166534" : "#92400e" }}>
              {netStorePayout >= 0 ? "Net Transfer Payable to Store (Admin -> Store)" : "Net Balance Due (Store -> Admin)"}
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: netStorePayout >= 0 ? "#15803d" : "#b45309", marginTop: "4px" }}>
              ₹{Number(Math.abs(netStorePayout)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#334155" }}>
              {netStorePayout >= 0
                ? `Online store earnings ₹${Number(onlineStorePayable).toFixed(2)} minus COD commission deduction ₹${Number(codCommission).toFixed(2)}.`
                : `Store has collected more cash commission (₹${Number(codCommission).toFixed(2)}) than online earnings (₹${Number(onlineStorePayable).toFixed(2)}).`
              }
            </p>
          </div>

          {/* Online vs COD Detailed Table */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 700 }}>Channel / Mode</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>Orders</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>Gross Total (₹)</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>Admin Comm (₹)</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>Store Share (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 700, color: "#1d4ed8", display: "flex", alignItems: "center", gap: "6px" }}>
                      <CreditCard size={14} /> Online Paid Orders (Razorpay)
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Funds collected by Admin</span>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>{onlineOrdersCount}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>₹{Number(onlineTotalAmount).toFixed(2)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>₹{Number(onlineCommission).toFixed(2)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>
                    +₹{Number(onlineStorePayable).toFixed(2)}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 700, color: "#b45309", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Banknote size={14} /> Cash on Delivery (COD)
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Cash collected directly by Store</span>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>{codOrdersCount}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>₹{Number(codTotalAmount).toFixed(2)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: "#dc2626" }}>
                    -₹{Number(codCommission).toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#64748b" }}>Retained by Store</td>
                </tr>
                <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                  <td style={{ padding: "12px 14px", textTransform: "uppercase" }}>Net Settlement Total</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>{validOrders.length}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>₹{Number(totalVolume).toFixed(2)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>₹{Number(totalCommission).toFixed(2)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", color: netStorePayout >= 0 ? "#15803d" : "#b45309", fontSize: "14px" }}>
                    ₹{Number(netStorePayout).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Orders Breakdown List */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                Orders Included in this Statement ({validOrders.length})
              </h4>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Latest orders first</span>
            </div>

            <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", color: "#475569" }}>Order #</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", color: "#475569" }}>Date</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", color: "#475569" }}>Customer</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", color: "#475569" }}>Payment</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", color: "#475569" }}>Total</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", color: "#475569" }}>Comm</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", color: "#475569" }}>Store Net</th>
                  </tr>
                </thead>
                <tbody>
                  {validOrders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "6px 10px", fontWeight: 700 }}>{o.order_number || `#${o.id}`}</td>
                      <td style={{ padding: "6px 10px", color: "#64748b" }}>
                        {new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                      <td style={{ padding: "6px 10px" }}>{o.customer_name || "Guest"}</td>
                      <td style={{ padding: "6px 10px" }}>{o.payment_method || "COD"}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>₹{Number(o.total_amount || 0).toFixed(0)}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: "#dc2626" }}>
                        ₹{Number(o.admin_commission_amount || 0).toFixed(0)}
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: "#16a34a" }}>
                        ₹{Number(o.store_payable_amount || 0).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: "11.5px", color: "#64748b" }}>
            Generated by SFC Bakers Multi-Store Accounting System
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

