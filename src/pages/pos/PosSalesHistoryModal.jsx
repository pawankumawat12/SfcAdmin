import { useState } from "react";
import {
  X,
  Search,
  Calendar,
  Clock,
  User,
  Phone,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Plus,
  Trash2,
  ArrowRight,
  CreditCard,
  Banknote,
  QrCode,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetPosSalesHistoryQuery,
  useUpdatePosSaleMutation,
} from "../../services/orderApi";
import Button from "../../components/ui/Button";
import useDebouncedValue from "../../utils/useDebouncedValue";

export default function PosSalesHistoryModal({
  isOpen,
  onClose,
  allProducts = [],
  onSaleUpdated,
  storeId,
  storeName,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 400);
  const [editingSale, setEditingSale] = useState(null);

  // Editable fields when editing an order
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("Cash");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState([]);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editIncludeTax, setEditIncludeTax] = useState(false);

  const {
    data: historyResponse,
    isLoading,
    refetch,
  } = useGetPosSalesHistoryQuery(
    {
      search: debouncedSearchTerm.trim() || undefined,
      limit: 50,
      storeId: storeId !== undefined ? storeId : undefined,
    },
    { skip: !isOpen }
  );

  const [updatePosSale, { isLoading: isUpdating }] = useUpdatePosSaleMutation();

  const sales = historyResponse?.data || [];

  if (!isOpen) return null;

  const startEditing = (sale) => {
    setEditingSale(sale);
    setEditCustomerName(sale.customer_name || "Walk-in Customer");
    setEditCustomerPhone(sale.customer_phone || "");
    setEditPaymentMethod(sale.payment_method || "Cash");
    setEditNotes(sale.notes || "");
    setEditDiscount(Number(sale.discount) || 0);
    // If the sale previously had tax applied, enable toggle
    setEditIncludeTax(Number(sale.tax_amount) > 0);

    // Map existing items
    const mappedItems = (sale.items || []).map((it) => ({
      id: it.product_id,
      product_id: it.product_id,
      name: it.product_name,
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      image: it.image,
    }));
    setEditItems(mappedItems);
  };

  const handleUpdateItemQty = (index, delta) => {
    setEditItems((prev) =>
      prev
        .map((item, idx) => {
          if (idx === index) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveItem = (index) => {
    if (editItems.length <= 1) {
      toast.error("Sale must contain at least one product");
      return;
    }
    setEditItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddProductToEdit = (e) => {
    const prodId = Number(e.target.value);
    if (!prodId) return;
    const prod = allProducts.find((p) => p.id === prodId);
    if (!prod) return;

    const existingIndex = editItems.findIndex(
      (item) => Number(item.id || item.product_id) === prodId
    );

    if (existingIndex >= 0) {
      handleUpdateItemQty(existingIndex, 1);
    } else {
      setEditItems((prev) => [
        ...prev,
        {
          id: prod.id,
          product_id: prod.id,
          name: prod.name,
          price: Number(prod.price) || 0,
          quantity: 1,
          images: prod.images,
        },
      ]);
    }
    e.target.value = "";
  };

  // Calculations for edit mode
  const calculatedSubtotal = editItems.reduce(
    (acc, it) => acc + Number(it.price) * Number(it.quantity),
    0
  );
  const calculatedTax = editIncludeTax
    ? (Math.max(0, calculatedSubtotal - (Number(editDiscount) || 0)) * 5) / 100
    : 0;
  const calculatedTotal = Math.max(0, calculatedSubtotal - (Number(editDiscount) || 0) + calculatedTax);

  const handleSaveEdit = async () => {
    if (!editingSale) return;
    if (editItems.length === 0) {
      toast.error("At least one product is required");
      return;
    }

    try {
      const payload = {
        id: editingSale.id,
        customerName: editCustomerName.trim() || "Walk-in Customer",
        customerPhone: editCustomerPhone.trim(),
        paymentMethod: editPaymentMethod,
        notes: editNotes.trim(),
        subtotal: calculatedSubtotal,
        discount: Number(editDiscount) || 0,
        tax: calculatedTax,
        totalAmount: calculatedTotal,
        items: editItems.map((it) => ({
          id: it.id || it.product_id,
          product_id: it.product_id || it.id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          images: it.image || it.images,
        })),
      };

      await updatePosSale(payload).unwrap();
      toast.success("POS sale updated! Stock & Total Revenue recalculated.");
      setEditingSale(null);
      refetch();
      if (onSaleUpdated) onSaleUpdated();
    } catch (err) {
      console.error("Update sale error:", err);
      toast.error(err?.data?.message || err?.message || "Failed to update sale");
    }
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1060 }}
      tabIndex="-1"
      onClick={(e) => {
        if (e.target === e.currentTarget || e.target.classList.contains("modal-dialog")) {
          if (editingSale) {
            setEditingSale(null);
          } else {
            onClose();
          }
        }
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
        <div
          className="modal-content shadow-lg border-0 rounded-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header border-bottom bg-light px-4 py-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                }}
              >
                <Receipt size={20} />
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0 text-dark">
                  {editingSale
                    ? `Edit POS Sale #${editingSale.order_number}`
                    : `${storeName ? `${storeName} - ` : ""}Manual POS Sales History`}
                </h5>
                <p className="text-muted small mb-0">
                  {editingSale
                    ? "Modify quantities, products, or payment. Stock & revenue will adjust automatically."
                    : `Complete record of manually sold products, revenue, and order items${storeName ? ` for ${storeName}` : ""}.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => {
                if (editingSale) {
                  setEditingSale(null);
                } else {
                  onClose();
                }
              }}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4 bg-white" style={{ minHeight: "450px" }}>
            {editingSale ? (
              /* Edit Sale Mode */
              <div>
                <div className="alert alert-primary py-2 px-3 small d-flex align-items-center gap-2 mb-4">
                  <AlertCircle size={16} />
                  <span>
                    <strong>Auto Re-balancing:</strong> Editing items will restore previous stock & ingredients and deduct according to the new quantities. Total Revenue updates automatically.
                  </span>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Customer Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control form-control-sm"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Payment Method</label>
                    <select
                      className="form-select form-select-sm"
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                </div>

                {/* Add more products */}
                <div className="card shadow-xs border mb-4">
                  <div className="card-header bg-light py-2 px-3 d-flex align-items-center justify-content-between">
                    <span className="fw-semibold small text-dark">Order Items ({editItems.length})</span>
                    <div style={{ maxWidth: "260px" }}>
                      <select
                        className="form-select form-select-sm"
                        defaultValue=""
                        onChange={handleAddProductToEdit}
                      >
                        <option value="" disabled>+ Add product to bill</option>
                        {allProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{Number(p.price).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light text-muted small">
                        <tr>
                          <th>Item Name</th>
                          <th>Price</th>
                          <th style={{ width: "160px" }}>Quantity</th>
                          <th>Total</th>
                          <th style={{ width: "50px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {editItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="fw-medium text-dark">{item.name}</td>
                            <td>₹{item.price.toFixed(2)}</td>
                            <td>
                              <div className="d-flex align-items-center border rounded bg-white" style={{ width: "fit-content" }}>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-icon py-0 px-2 text-secondary"
                                  onClick={() => handleUpdateItemQty(idx, -1)}
                                >
                                  -
                                </button>
                                <span className="px-2 fw-bold text-dark small">{item.quantity}</span>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-icon py-0 px-2 text-secondary"
                                  onClick={() => handleUpdateItemQty(idx, 1)}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="fw-bold text-dark">₹{(item.price * item.quantity).toFixed(2)}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-link text-danger p-0"
                                onClick={() => handleRemoveItem(idx)}
                                title="Remove item"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Edit Financials Summary */}
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Order Notes / Remark</label>
                    <textarea
                      rows={3}
                      className="form-control form-control-sm"
                      placeholder="e.g. Discount given or revised order reason"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="card bg-light border p-3 rounded-3">
                      <div className="d-flex justify-content-between small text-muted mb-1">
                        <span>Subtotal</span>
                        <span>₹{calculatedSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small text-muted">Discount (₹)</span>
                        <input
                          type="number"
                          min="0"
                          style={{ width: "100px" }}
                          className="form-control form-control-sm text-end"
                          value={editDiscount}
                          onChange={(e) => setEditDiscount(e.target.value)}
                        />
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted fw-semibold">GST (5%)</span>
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className={`btn btn-xs py-0.5 px-2.5 rounded-2 ${
                              editIncludeTax
                                ? "btn-primary fw-bold"
                                : "btn-outline-secondary"
                            }`}
                            style={{ fontSize: "11px" }}
                            onClick={() => setEditIncludeTax(true)}
                          >
                            Apply GST
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs py-0.5 px-2.5 rounded-2 ${
                              !editIncludeTax
                                ? "btn-dark fw-bold text-white"
                                : "btn-outline-secondary"
                            }`}
                            style={{ fontSize: "11px" }}
                            onClick={() => setEditIncludeTax(false)}
                          >
                            Not Apply
                          </button>
                        </div>
                      </div>
                      {editIncludeTax && (
                        <div className="d-flex justify-content-between small text-muted mb-1">
                          <span>GST (5% Calculated)</span>
                          <span className="text-dark fw-semibold">₹{calculatedTax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between fw-bold fs-6 text-dark pt-2 border-top mt-1">
                        <span>Revised Total Revenue</span>
                        <span className="text-primary">₹{calculatedTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Edit Footer Actions */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <Button variant="outline" onClick={() => setEditingSale(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={isUpdating}>
                    {isUpdating ? "Saving Changes..." : "Save & Update Revenue"}
                  </Button>
                </div>
              </div>
            ) : (
              /* History List Mode */
              <div>
                {/* Search Bar */}
                <div className="d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
                  <div className="input-group input-group-sm" style={{ maxWidth: "340px" }}>
                    <span className="input-group-text bg-light border-end-0">
                      <Search size={14} className="text-muted" />
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0 ps-0"
                      placeholder="Search order number, customer, phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="text-muted small">
                    Showing <strong>{sales.length}</strong> recorded manual sales
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading manual sales history...
                  </div>
                ) : sales.length === 0 ? (
                  <div className="text-center py-5">
                    <Receipt size={40} className="text-muted opacity-30 mb-2" />
                    <h6 className="fw-semibold text-secondary">No manual sales found</h6>
                    <p className="text-muted small">
                      {debouncedSearchTerm
                        ? "No orders matching your search query."
                        : "Sales completed from the POS counter will appear here."}
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle border mb-0">
                      <thead className="table-light text-muted small">
                        <tr>
                          <th>Order / Date</th>
                          <th>Customer</th>
                          <th>Items Sold</th>
                          <th>Payment</th>
                          <th className="text-end">Amount (Revenue)</th>
                          <th className="text-center" style={{ width: "90px" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((sale) => (
                          <tr key={sale.id}>
                            <td>
                              <div className="fw-bold text-dark font-monospace small">
                                {sale.order_number}
                              </div>
                              <div className="text-muted" style={{ fontSize: "11px" }}>
                                {new Date(sale.created_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </td>

                            <td>
                              <div className="fw-medium text-dark small d-flex align-items-center gap-1">
                                <User size={13} className="text-secondary" />
                                <span>{sale.customer_name || "Walk-in"}</span>
                              </div>
                              {sale.customer_phone && (
                                <div className="text-muted small" style={{ fontSize: "11px" }}>
                                  {sale.customer_phone}
                                </div>
                              )}
                            </td>

                            <td>
                              <div className="d-flex flex-column gap-1">
                                {(sale.items || []).map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="d-flex align-items-center justify-content-between text-dark"
                                    style={{ fontSize: "12px" }}
                                  >
                                    <span className="text-truncate" style={{ maxWidth: "220px" }}>
                                      • {it.product_name || "Product"}
                                    </span>
                                    <span className="badge bg-light text-secondary border ms-2">
                                      x{it.quantity} (₹{Number(it.price).toFixed(2)})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td>
                              <span className="badge bg-secondary-subtle text-dark border px-2 py-1 small">
                                {sale.payment_method || "Cash"}
                              </span>
                            </td>

                            <td className="text-end">
                              <span className="fw-bolder text-dark fs-6">
                                ₹{Number(sale.total_amount).toFixed(2)}
                              </span>
                              {Number(sale.discount) > 0 && (
                                <div className="text-danger small" style={{ fontSize: "10.5px" }}>
                                  -₹{Number(sale.discount).toFixed(2)} off
                                </div>
                              )}
                            </td>

                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 py-1 px-2.5 rounded-2"
                                style={{ fontSize: "11.5px" }}
                                onClick={() => startEditing(sale)}
                                title="Edit sale items or amount"
                              >
                                <Pencil size={12} />
                                <span>Edit</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!editingSale && (
            <div className="modal-footer bg-light px-4 py-2.5 border-top d-flex justify-content-between">
              <span className="text-muted small">
                Showing all manual in-store sales. Any edit updates your store revenue and ingredient BOM.
              </span>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

