import { useState, useEffect } from "react";
import { X, Upload, Package, DollarSign, Layers, CheckCircle2, AlertCircle, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProductCategoriesQuery,
} from "../../services/productApi";
import toAssetUrl from "../../utils/assetUrl";

export default function PosProductModal({ isOpen, onClose, productToEdit, onSuccess, storeId, storeName }) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("999");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const { data: categoriesResponse, isLoading: isLoadingCats } = useGetProductCategoriesQuery();
  const categories = categoriesResponse?.data || [];

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const isSaving = isCreating || isUpdating;

  const resetForm = () => {
    setName("");
    setCategoryId(categories.length > 0 ? String(categories[0].id) : "");
    setPrice("");
    setStock("999");
    setDescription("");
    setStatus("Active");
    setImageFile(null);
    setImagePreview("");
    const fileInput = document.getElementById("posProductImageInput");
    if (fileInput) fileInput.value = "";
  };

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || "");
      setCategoryId(productToEdit.category_id || productToEdit.categoryId || "");
      setPrice(productToEdit.price !== undefined ? String(productToEdit.price) : "");
      setStock(productToEdit.stock !== undefined ? String(productToEdit.stock) : "999");
      setDescription(productToEdit.description || "");
      setStatus(productToEdit.is_active ? "Active" : "Inactive");

      let prevImg = "";
      if (productToEdit.images) {
        try {
          const parsed = typeof productToEdit.images === "string" ? JSON.parse(productToEdit.images) : productToEdit.images;
          if (Array.isArray(parsed) && parsed.length > 0) prevImg = parsed[0];
        } catch {
          prevImg = productToEdit.images;
        }
      }
      setImagePreview(prevImg ? toAssetUrl(prevImg) : "");
      setImageFile(null);
    } else {
      resetForm();
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file (PNG, JPG, WEBP, GIF)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file size should not exceed 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    const fileInput = document.getElementById("posProductImageInput");
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter item name");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!price || Number(price) < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      if (productToEdit) {
        let existingImages = [];
        if (!imageFile && productToEdit.images) {
          try {
            existingImages = typeof productToEdit.images === "string" ? JSON.parse(productToEdit.images) : productToEdit.images;
            if (!Array.isArray(existingImages)) existingImages = [existingImages];
          } catch {
            existingImages = [productToEdit.images];
          }
        }

        await updateProduct({
          id: productToEdit.id,
          name: name.trim(),
          categoryId: Number(categoryId),
          price: Number(price),
          stock: Number(stock) || 0,
          description: description.trim(),
          status,
          availabilityType: "IN_STOCK",
          is_pos_only: true,
          storeId: storeId ? Number(storeId) : undefined,
          store_id: storeId ? Number(storeId) : undefined,
          existingImages,
          imageFiles: imageFile ? [imageFile] : [],
        }).unwrap();

        toast.success("POS Product updated successfully!");
      } else {
        await createProduct({
          name: name.trim(),
          categoryId: Number(categoryId),
          price: Number(price),
          stock: Number(stock) || 0,
          description: description.trim(),
          status,
          availabilityType: "IN_STOCK",
          is_pos_only: true,
          storeId: storeId ? Number(storeId) : undefined,
          store_id: storeId ? Number(storeId) : undefined,
          imageFiles: imageFile ? [imageFile] : [],
        }).unwrap();

        toast.success("New POS Counter Product created!");
      }

      onClose();
      resetForm();
      if (onSuccess) {
        try {
          await onSuccess();
        } catch (callbackErr) {
          console.warn("PosProductModal onSuccess callback notice:", callbackErr);
        }
      }
    } catch (err) {
      console.error("Save POS product error:", err);
      toast.error(err?.data?.message || err?.message || "Failed to save product");
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        zIndex: 1060,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        className="card border shadow-lg rounded-3 overflow-hidden w-100 bg-white"
        style={{ maxWidth: "560px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-light">
          <div>
            <h5 className="mb-0 fw-bold fs-6 text-dark">
              {productToEdit ? "Edit POS Item" : "Create POS Counter Item"}
            </h5>
            <span className="text-muted" style={{ fontSize: "12px" }}>
              {storeName ? `${storeName} Item exclusively for POS Terminal (Hidden from Online Store)` : "Item exclusively for POS Terminal (Hidden from Online Store)"}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-icon text-muted p-1 border-0"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto" style={{ flex: 1 }}>
          <div className="row g-3">
            {/* Item Name */}
            <div className="col-12">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Item Name <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <Package size={16} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="e.g. Masala Tea, Special Combo, Counter Snack"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSaving}
                  autoFocus
                />
              </div>
            </div>

            {/* Category */}
            <div className="col-md-6 col-12">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Category <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <Layers size={16} className="text-muted" />
                </span>
                <select
                  className="form-select border-start-0 ps-0"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  disabled={isSaving || isLoadingCats}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selling Price */}
            <div className="col-md-6 col-12">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Price (₹) <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 fw-bold text-muted">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control border-start-0 ps-0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Stock Quantity */}
            <div className="col-md-6 col-12">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="999"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                disabled={isSaving}
              />
              <div className="form-text" style={{ fontSize: "11px" }}>
                Default 999 for instant counter availability
              </div>
            </div>

            {/* Status */}
            <div className="col-md-6 col-12">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Status
              </label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSaving}
              >
                <option value="Active">Active (Available on POS)</option>
                <option value="Inactive">Inactive (Disabled)</option>
              </select>
            </div>

            {/* Optional Image */}
            <div className="col-12">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Product Image <span className="text-muted fw-normal">(Optional)</span>
              </label>
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 border border-dashed d-flex align-items-center justify-content-center overflow-hidden position-relative bg-light shadow-2xs"
                  style={{ width: "70px", height: "70px", flexShrink: 0 }}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-100 h-100 object-fit-cover"
                      onError={() => setImagePreview("")}
                    />
                  ) : (
                    <Package size={28} className="text-muted opacity-50" />
                  )}
                </div>
                <div className="flex-grow-1">
                  <input
                    type="file"
                    id="posProductImageInput"
                    className="d-none"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageChange}
                    disabled={isSaving}
                  />
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <label
                      htmlFor="posProductImageInput"
                      className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2 rounded-3 px-3 py-1.5 mb-0"
                      style={{ cursor: "pointer" }}
                    >
                      <Upload size={14} />
                      <span>{imagePreview ? "Change Image" : "Upload Picture"}</span>
                    </label>
                    {imagePreview && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1.5 rounded-3 px-2.5 py-1.5"
                        onClick={handleRemoveImage}
                        disabled={isSaving}
                      >
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                    PNG, JPG, or WEBP (Max 5MB). Standard item icon is assigned if omitted.
                  </div>
                </div>
              </div>
            </div>

            {/* Notes / Description */}
            <div className="col-12">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Description / Kitchen Notes <span className="text-muted fw-normal">(Optional)</span>
              </label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Optional preparation details or counter specs..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
              ></textarea>
            </div>
          </div>

          {/* Notice Box */}
          <div className="alert alert-primary bg-indigo-50 border-0 text-indigo-900 rounded-3 p-3 mt-3 mb-0 d-flex gap-2.5 align-items-start">
            <CheckCircle2 size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
            <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
              <strong>Zero-friction Catalog:</strong> This item is instantly available on the POS terminal for fast cash/UPI billing. It is completely isolated and will <strong>not</strong> show up in your online ecommerce product list or customer app.
            </div>
          </div>

          {/* Modal Footer */}
          <div className="d-flex align-items-center justify-content-end gap-2 pt-3 mt-3 border-top">
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4 fw-semibold"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="me-1 d-inline" />
                  {productToEdit ? "Update Item" : "Create Item"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

