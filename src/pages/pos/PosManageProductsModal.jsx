import { useState, useMemo } from "react";
import {
  X,
  Search,
  Plus,
  Pencil,
  Trash2,
  Package,
  Sparkles,
  AlertCircle,
  Tag,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDeleteProductMutation, useUpdateProductMutation } from "../../services/productApi";
import toAssetUrl from "../../utils/assetUrl";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function PosManageProductsModal({
  isOpen,
  onClose,
  allProducts = [],
  onAddNew,
  onEditProduct,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [itemToDelete, setItemToDelete] = useState(null);

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  // Filter only items that were created exclusively for Admin POS
  const posOnlyItems = useMemo(() => {
    return (allProducts || []).filter(
      (p) =>
        p.store_id == null &&
        (p.is_pos_only === true || p.isPosOnly === true)
    );
  }, [allProducts]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return posOnlyItems;
    const query = searchTerm.toLowerCase();
    return posOnlyItems.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.category_name?.toLowerCase().includes(query)
    );
  }, [posOnlyItems, searchTerm]);

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteProduct(itemToDelete.id).unwrap();
      toast.success(`Removed "${itemToDelete.name}" from POS items`);
      setItemToDelete(null);
    } catch (err) {
      console.error("Delete POS product error:", err);
      toast.error(err?.data?.message || err?.message || "Failed to delete item");
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const nextActive = !item.is_active;
      await updateProduct({
        id: item.id,
        name: item.name,
        categoryId: item.category_id,
        price: item.price,
        stock: item.stock,
        status: nextActive ? "Active" : "Inactive",
        is_pos_only: true,
      }).unwrap();
      toast.success(
        `"${item.name}" is now ${nextActive ? "Active" : "Inactive"}`
      );
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{
          zIndex: 1055,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          padding: "16px",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="card border shadow-lg rounded-3 overflow-hidden w-100 bg-white"
          style={{
            maxWidth: "780px",
            height: "85vh",
            maxHeight: "750px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-light">
            <div>
              <h5 className="mb-0 fw-bold fs-6 text-dark">
                Manage POS Exclusive Items
              </h5>
              <span className="text-muted" style={{ fontSize: "12px" }}>
                {posOnlyItems.length} Admin items configured specifically for POS counter
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary fw-semibold d-inline-flex align-items-center gap-1.5 px-3"
                onClick={() => {
                  onAddNew();
                }}
              >
                <Plus size={15} />
                <span>Add Item</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-icon text-muted p-1 border-0"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search bar & summary */}
          <div className="p-3 border-bottom bg-light d-flex align-items-center justify-content-between gap-3">
            <div className="position-relative flex-grow-1" style={{ maxWidth: "380px" }}>
              <Search
                size={16}
                className="position-absolute top-50 translate-middle-y text-muted"
                style={{ left: "12px" }}
              />
              <input
                type="text"
                className="form-control form-control-sm ps-5 rounded-3 bg-white"
                placeholder="Search POS items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted position-absolute top-50 translate-middle-y end-0 pe-2"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="text-secondary small fw-medium">
              Showing <strong>{filteredItems.length}</strong> of {posOnlyItems.length} items
            </div>
          </div>

          {/* Items List */}
          <div className="p-3 overflow-y-auto flex-grow-1">
            {filteredItems.length === 0 ? (
              <div className="text-center py-5">
                <div
                  className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center text-muted mb-3"
                  style={{ width: "64px", height: "64px" }}
                >
                  <Package size={30} className="opacity-40" />
                </div>
                <h6 className="fw-semibold text-secondary mb-1">
                  {searchTerm ? "No matching POS items found" : "No POS Exclusive Items Yet"}
                </h6>
                <p className="text-muted small mb-3" style={{ maxWidth: "340px", margin: "0 auto" }}>
                  Items created here will only appear on your POS counter terminal and remain hidden from your storefront.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm rounded-3 px-3.5 py-2 fw-semibold d-inline-flex align-items-center gap-1.5 shadow-sm"
                  style={{ background: "#4f46e5", border: "none" }}
                  onClick={onAddNew}
                >
                  <Plus size={16} />
                  <span>Create First POS Item</span>
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-secondary small text-uppercase fw-semibold">
                    <tr>
                      <th style={{ width: "50px" }}>Item</th>
                      <th>Name & Details</th>
                      <th>Category</th>
                      <th className="text-end">Price</th>
                      <th className="text-center">Stock</th>
                      <th className="text-center">Status</th>
                      <th className="text-end" style={{ width: "110px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      let imgUrl = "";
                      if (item.images) {
                        try {
                          const parsed =
                            typeof item.images === "string"
                              ? JSON.parse(item.images)
                              : item.images;
                          if (Array.isArray(parsed) && parsed.length > 0)
                            imgUrl = parsed[0];
                        } catch {
                          imgUrl = item.images;
                        }
                      }

                      return (
                        <tr key={item.id}>
                          <td>
                            <div
                              className="rounded-3 border overflow-hidden bg-light d-flex align-items-center justify-content-center"
                              style={{ width: "44px", height: "44px" }}
                            >
                              {imgUrl ? (
                                <img
                                  src={toAssetUrl(imgUrl)}
                                  alt={item.name}
                                  className="w-100 h-100 object-fit-cover"
                                />
                              ) : (
                                <Package size={20} className="text-muted opacity-40" />
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="fw-semibold text-dark fs-6 mb-0.5">
                              {item.name}
                            </div>
                            <span
                              className="badge rounded-pill bg-purple-subtle text-purple fw-medium"
                              style={{
                                fontSize: "10px",
                                backgroundColor: "#ede9fe",
                                color: "#6b21a8",
                              }}
                            >
                              POS Exclusive
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-light text-secondary border fw-normal">
                              {item.category_name || "Uncategorized"}
                            </span>
                          </td>
                          <td className="text-end fw-bold text-dark fs-6">
                            ₹{Number(item.price).toFixed(2)}
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge rounded-pill ${
                                Number(item.stock) > 10
                                  ? "bg-success-subtle text-success"
                                  : Number(item.stock) > 0
                                  ? "bg-warning-subtle text-warning-emphasis"
                                  : "bg-danger-subtle text-danger"
                              }`}
                              style={{ fontSize: "11px" }}
                            >
                              {item.stock ?? 0} in stock
                            </span>
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className={`btn btn-sm py-0.5 px-2 rounded-pill fw-semibold border-0 ${
                                item.is_active
                                  ? "bg-success-subtle text-success"
                                  : "bg-secondary-subtle text-secondary"
                              }`}
                              style={{ fontSize: "11px" }}
                              onClick={() => handleToggleStatus(item)}
                              title="Click to toggle active status"
                            >
                              {item.is_active ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="text-end">
                            <div className="d-inline-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-light btn-sm text-primary p-1.5 rounded-2"
                                title="Edit Item"
                                onClick={() => onEditProduct(item)}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-light btn-sm text-danger p-1.5 rounded-2"
                                title="Delete Item"
                                onClick={() => setItemToDelete(item)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-top bg-light d-flex align-items-center justify-content-between">
            <span className="text-muted small">
              Note: Changes here reflect immediately across all connected POS terminals.
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm px-4 rounded-3"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        title="Delete POS Item?"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This item will be permanently removed from POS counter.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
      />
    </>
  );
}

