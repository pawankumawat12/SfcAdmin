import { useRef } from "react";
import { Printer, X, CheckCircle, Share2, Sparkles, Store } from "lucide-react";

export default function PosReceiptModal({
  isOpen,
  onClose,
  saleData,
  onNewSale,
}) {
  const receiptRef = useRef(null);

  if (!isOpen || !saleData) return null;

  const {
    orderNumber = "POS-0001",
    customerName = "Walk-in Customer",
    customerPhone = "",
    items = [],
    subtotal = 0,
    discount = 0,
    tax = 0,
    totalAmount = 0,
    paymentMethod = "Cash",
    receivedAmount = 0,
    changeAmount = 0,
    date = new Date().toLocaleString(),
    cashierName = "Cashier Terminal",
    storeName = "Sweet & Savory Bakery",
    storeAddress = "Main Road Counter, Store #01",
  } = saleData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        zIndex: 1070,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(6px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card border shadow-lg rounded-3 overflow-hidden w-100 bg-white"
        style={{
          maxWidth: "460px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-light">
          <div className="d-flex align-items-center gap-2">
            <CheckCircle size={18} className="text-success" />
            <div>
              <h6 className="mb-0 fw-bold fs-6 text-dark">Payment Successful</h6>
              <span className="text-muted" style={{ fontSize: "12px" }}>
                Thermal Receipt Preview
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-icon text-muted p-1 border-0"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-4 overflow-y-auto flex-grow-1 bg-light">
          <div
            id="pos-thermal-receipt"
            ref={receiptRef}
            className="bg-white p-4 shadow-sm mx-auto rounded-3 border"
            style={{
              width: "100%",
              maxWidth: "340px",
              fontFamily: "'Courier New', Courier, monospace",
              color: "#111827",
              fontSize: "12px",
              lineHeight: "1.4",
            }}
          >
            {/* Header info */}
            <div className="text-center mb-3">
              <h5 className="fw-bold mb-1 text-uppercase tracking-wider" style={{ fontSize: "16px" }}>
                {storeName}
              </h5>
              <div className="text-muted" style={{ fontSize: "11px" }}>{storeAddress}</div>
              <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                Terminal: <strong>{cashierName}</strong>
              </div>
            </div>

            <div className="border-top border-bottom border-dark border-dashed py-2 my-2" style={{ fontSize: "11px" }}>
              <div className="d-flex justify-content-between">
                <span>Receipt #:</span>
                <strong>{orderNumber}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span>Date:</span>
                <span>{date}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Customer:</span>
                <span>{customerName}</span>
              </div>
              {customerPhone && (
                <div className="d-flex justify-content-between">
                  <span>Phone:</span>
                  <span>{customerPhone}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <table className="w-100 my-2" style={{ fontSize: "11.5px" }}>
              <thead>
                <tr className="border-bottom border-dark border-dashed">
                  <th className="text-start pb-1">Item</th>
                  <th className="text-center pb-1">Qty</th>
                  <th className="text-end pb-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="pt-1.5 text-start">
                      <div className="fw-semibold text-truncate" style={{ maxWidth: "160px" }}>
                        {item.name}
                      </div>
                      <small className="text-muted" style={{ fontSize: "10px" }}>
                        @ ₹{Number(item.price).toFixed(2)}
                      </small>
                    </td>
                    <td className="pt-1.5 text-center align-top">x{item.quantity}</td>
                    <td className="pt-1.5 text-end align-top fw-bold">
                      ₹{(Number(item.price) * Number(item.quantity)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-top border-dark border-dashed pt-2 mt-2" style={{ fontSize: "11.5px" }}>
              <div className="d-flex justify-content-between py-0.5">
                <span>Subtotal:</span>
                <span>₹{Number(subtotal).toFixed(2)}</span>
              </div>
              {Number(discount) > 0 && (
                <div className="d-flex justify-content-between py-0.5 text-danger">
                  <span>Discount:</span>
                  <span>-₹{Number(discount).toFixed(2)}</span>
                </div>
              )}
              {Number(tax) > 0 && (
                <div className="d-flex justify-content-between py-0.5">
                  <span>Tax / GST:</span>
                  <span>₹{Number(tax).toFixed(2)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between py-1 border-top border-bottom border-dark my-1 fw-bold fs-6">
                <span>GRAND TOTAL:</span>
                <span>₹{Number(totalAmount).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between py-0.5">
                <span>Payment Mode:</span>
                <span className="text-uppercase fw-semibold">{paymentMethod}</span>
              </div>
              {paymentMethod === "Cash" && (
                <>
                  <div className="d-flex justify-content-between py-0.5">
                    <span>Cash Received:</span>
                    <span>₹{Number(receivedAmount || totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between py-0.5 fw-bold text-success">
                    <span>Change Returned:</span>
                    <span>₹{Number(changeAmount || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Token Badge */}
            <div className="text-center mt-3 pt-2 border-top border-dark border-dashed">
              <div
                className="d-inline-block border border-2 border-dark px-3 py-1 fw-bold fs-6 mb-1 text-uppercase"
                style={{ letterSpacing: "1px" }}
              >
                TOKEN #{orderNumber.slice(-4)}
              </div>
              <div style={{ fontSize: "10.5px" }} className="text-muted mt-1">
                Thank you for your visit!
              </div>
              <div style={{ fontSize: "9.5px" }} className="text-muted">
                Have a wonderful day ahead!
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 border-top bg-white d-flex align-items-center justify-content-between gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm px-3 rounded-3"
            onClick={onClose}
          >
            Close
          </button>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-dark btn-sm rounded-3 d-inline-flex align-items-center gap-1.5 px-3.5 shadow-sm"
              onClick={handlePrint}
            >
              <Printer size={15} />
              <span>Print Thermal Bill</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm rounded-3 d-inline-flex align-items-center gap-1.5 px-3.5 fw-semibold shadow-sm"
              style={{ background: "#059669", border: "none" }}
              onClick={() => {
                onClose();
                onNewSale?.();
              }}
            >
              <span>Next Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print CSS styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pos-thermal-receipt, #pos-thermal-receipt * {
            visibility: visible !important;
          }
          #pos-thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 8px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

