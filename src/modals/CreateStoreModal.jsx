import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { X, Store, Check, Tags } from "lucide-react";
import { useCreateStoreMutation } from "../services/storeApi";
import { useGetCategoriesQuery } from "../services/categoryApi";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { isValidIndianPhone } from "../utils/phoneValidation";

export default function CreateStoreModal({ isOpen, onClose, onSuccess }) {
  const [createStore, { isLoading: isCreating }] = useCreateStoreMutation();
  const { data: categoriesData, isLoading: loadingCategories } = useGetCategoriesQuery({
    limit: 100,
    isActive: true,
  });

  const categories = categoriesData?.data || [];
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      storeName: "",
      phone: "",
      email: "",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      maxDeliveryDistance: 10,
    },
  });

  if (!isOpen) return null;

  const toggleCategory = (id) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCategories = () => {
    if (selectedCategoryIds.length === categories.length) {
      setSelectedCategoryIds([]);
    } else {
      setSelectedCategoryIds(categories.map((c) => c.id));
    }
  };

  const handleClose = () => {
    setApiError("");
    onClose();
  };

  const onSubmit = async (data) => {
    setApiError("");
    if (selectedCategoryIds.length === 0) {
      setApiError("Please assign at least one category to this store.");
      return;
    }

    try {
      const payload = {
        ...data,
        max_delivery_distance: Number(data.maxDeliveryDistance) || 10,
        categoryIds: selectedCategoryIds,
      };

      const res = await createStore(payload).unwrap();
      toast.success(res?.message || "Store created successfully!");
      reset();
      setSelectedCategoryIds([]);
      setApiError("");
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      onClose();
    } catch (err) {
      const msg = err?.data?.message || "Failed to create store. Please try again.";
      setApiError(msg);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isCreating) handleClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCreating) handleClose();
      }}
    >
      <section
        className="admin-dialog admin-dialog-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-modal-title"
      >
        <Button
          variant="plain"
          className="modal-close"
          onClick={handleClose}
          disabled={isCreating}
          aria-label="Close"
        >
          <X size={18} />
        </Button>

        <span className="confirm-icon">
          <Store size={22} />
        </span>

        <h2 id="store-modal-title">Add New Store &amp; Partner</h2>
        <p>
          Register a branch location, assign an authorized Store Owner, and assign permitted product categories.
        </p>

        {apiError && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              margin: "12px 0 16px",
            }}
          >
            {apiError}
          </div>
        )}

        <form className="entity-form" onSubmit={handleSubmit(onSubmit)}>
          {/* Section 1: Store Details */}
          <div style={{ margin: "16px 0 8px", fontWeight: 700, fontSize: "13px", color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            1. Store Branch Information
          </div>

          <div className="form-grid">
            <label className="full">
              Store / Branch Name *
              <Input
                type="text"
                placeholder="e.g. SFC Bakers - Malviya Nagar"
                {...register("storeName", { required: "Store name is required" })}
                required
                autoFocus
              />
              {errors.storeName && (
                <small className="error">{errors.storeName.message}</small>
              )}
            </label>

            <label>
              Store Business Email *
              <Input
                type="email"
                placeholder="e.g. malviyanagar@sfcbakers.com"
                {...register("email", {
                  required: "Store business email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
                required
              />
              {errors.email && (
                <small className="error">{errors.email.message}</small>
              )}
            </label>

            <label>
              Store Business Phone *
              <Input
                type="tel"
                maxLength={10}
                placeholder="e.g. 9829012345"
                {...register("phone", {
                  required: "Store business phone is required",
                  validate: (val) =>
                    isValidIndianPhone(val) || "Enter a valid 10-digit phone number (starts with 6-9)",
                })}
                required
              />
              {errors.phone && (
                <small className="error">{errors.phone.message}</small>
              )}
            </label>

            <label>
              Max Delivery Radius (KM) *
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="100"
                placeholder="e.g. 10"
                {...register("maxDeliveryDistance", {
                  required: "Delivery radius is required",
                  min: { value: 0.5, message: "Minimum 0.5 km" },
                })}
                required
              />
              {errors.maxDeliveryDistance && (
                <small className="error">{errors.maxDeliveryDistance.message}</small>
              )}
            </label>
          </div>

          {/* Section 2: Store Owner Credentials */}
          <div style={{ margin: "20px 0 8px", fontWeight: 700, fontSize: "13px", color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            2. Store Owner Details
          </div>


          <div className="form-grid">
            <label className="full">
              Owner Full Name *
              <Input
                type="text"
                placeholder="e.g. Rajesh Sharma"
                {...register("ownerName", { required: "Owner full name is required" })}
                required
              />
              {errors.ownerName && (
                <small className="error">{errors.ownerName.message}</small>
              )}
            </label>

            <label>
              Owner Email Address *
              <Input
                type="email"
                placeholder="owner@gmail.com"
                {...register("ownerEmail", {
                  required: "Owner email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
                required
              />
              {errors.ownerEmail && (
                <small className="error">{errors.ownerEmail.message}</small>
              )}
            </label>

            <label>
              Owner Mobile *
              <Input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                {...register("ownerPhone", {
                  required: "Owner mobile number is required",
                  validate: (val) =>
                    isValidIndianPhone(val) || "Enter a valid 10-digit mobile number",
                })}
                required
              />
              {errors.ownerPhone && (
                <small className="error">{errors.ownerPhone.message}</small>
              )}
            </label>
          </div>

          {/* Section 3: Assigned Categories */}
          <div style={{ margin: "20px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              3. Permitted Product Categories *
            </span>
            <Button
              type="button"
              variant="text"
              onClick={handleSelectAllCategories}
              style={{ fontSize: "12px", padding: "0 4px" }}
            >
              {selectedCategoryIds.length === categories.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#6b7280" }}>
            The store owner will strictly be restricted to adding products inside these assigned categories.
          </p>

          <div
            style={{
              maxHeight: "160px",
              overflowY: "auto",
              padding: "10px",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              background: "#fafafa",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {loadingCategories ? (
              <small className="muted">Loading categories...</small>
            ) : categories.length === 0 ? (
              <small className="muted">No categories found in system.</small>
            ) : (
              categories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: isSelected ? "1px solid #16a34a" : "1px solid #d1d5db",
                      background: isSelected ? "#f0fdf4" : "#ffffff",
                      color: isSelected ? "#15803d" : "#374151",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "4px",
                        border: isSelected ? "none" : "1px solid #9ca3af",
                        background: isSelected ? "#16a34a" : "#ffffff",
                        display: "inline-grid",
                        placeItems: "center",
                        color: "#ffffff",
                        fontSize: "10px",
                      }}
                    >
                      {isSelected && "✓"}
                    </span>
                    {cat.name}
                  </button>
                );
              })
            )}
          </div>
          {selectedCategoryIds.length === 0 && (
            <small style={{ color: "#d97706", marginTop: "4px", display: "block" }}>
              Please select at least one category to assign.
            </small>
          )}

          {/* Modal Actions */}
          <div className="confirm-actions" style={{ marginTop: "24px" }}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              loading={isCreating}
            >
              {isCreating ? "Creating Store..." : "Create Store & Send Invitation"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
