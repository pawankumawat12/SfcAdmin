import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { X, Store, Check, Tags } from "lucide-react";
import { useUpdateStoreMutation } from "../services/storeApi";
import { useGetCategoriesQuery } from "../services/categoryApi";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { isValidIndianPhone } from "../utils/phoneValidation";
import StoreLocationPicker from "../pages/settings/StoreLocationPicker";

function SettingCheckbox({
  id,
  initialChecked,
  registerProps,
  color,
  title,
  description,
  divider = false,
}) {
  const [checked, setChecked] = useState(Boolean(initialChecked));
  const { onChange, ...inputProps } = registerProps;

  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "9px",
        cursor: "pointer",
        fontSize: "13px",
        paddingTop: divider ? "10px" : 0,
        borderTop: divider ? "1px dashed #cbd5e1" : "none",
      }}
    >
      <span
        style={{
          position: "relative",
          flex: "0 0 16px",
          width: "16px",
          height: "16px",
          marginTop: "2px",
        }}
      >
        <input
          id={id}
          type="checkbox"
          {...inputProps}
          checked={checked}
          onChange={(event) => {
            setChecked(event.target.checked);
            onChange(event);
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "16px",
            height: "16px",
            margin: 0,
            opacity: 0,
            cursor: "pointer",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            display: "grid",
            placeItems: "center",
            width: "16px",
            height: "16px",
            borderRadius: "5px",
            border: checked ? `1px solid ${color}` : "1px solid #cbd5e1",
            background: checked ? color : "#ffffff",
            boxShadow: checked ? `0 2px 5px ${color}33` : "none",
            color: "#ffffff",
            transition: "all 0.15s ease",
            pointerEvents: "none",
          }}
        >
          {checked && <Check size={10} strokeWidth={3.5} />}
        </span>
      </span>
      <div>
        <span style={{ fontWeight: 650, color }}>{title}</span>
        <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "12px", lineHeight: 1.45 }}>
          {description}
        </p>
      </div>
    </label>
  );
}

export default function EditStoreModal({ isOpen, onClose, store }) {
  const [updateStore, { isLoading: isUpdating }] = useUpdateStoreMutation();
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
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      city: "",
      state: "Rajasthan",
      address: "",
      pincode: "",
      is_open: true,
      is_active: true,
      auto_forward_orders: false,
      max_delivery_distance: 10,
      latitude: "",
      longitude: "",
    },
  });

  const watchedLatitude = watch("latitude");
  const watchedLongitude = watch("longitude");
  const watchedRadius = watch("max_delivery_distance");

  useEffect(() => {
    if (store) {
      setValue("name", store.name || "");
      setValue("email", store.email || "");
      setValue("phone", store.phone || "");
      setValue("city", store.city || "");
      setValue("state", store.state || "Rajasthan");
      setValue("address", store.address || "");
      setValue("pincode", store.pincode || "");
      setValue("is_open", store.is_open ?? true);
      setValue("is_active", store.is_active ?? true);
      setValue("auto_forward_orders", store.auto_forward_orders ?? false);
      setValue("max_delivery_distance", store.max_delivery_distance ?? 10);
      setValue("latitude", store.latitude ?? "");
      setValue("longitude", store.longitude ?? "");

      const assigned = Array.isArray(store.assigned_categories)
        ? store.assigned_categories.map((c) => Number(c.id))
        : [];
      // This state mirrors the store selected for editing when the modal opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategoryIds(assigned);
      setApiError("");
    }
  }, [store, setValue]);

  if (!isOpen || !store) return null;

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

  const onSubmit = async (formData) => {
    setApiError("");
    try {
      const payload = {
        id: store.id,
        ...formData,
        max_delivery_distance: Number(formData.max_delivery_distance) || 10,
        latitude: formData.latitude !== "" && formData.latitude != null ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude !== "" && formData.longitude != null ? parseFloat(formData.longitude) : null,
        categoryIds: selectedCategoryIds,
      };

      const res = await updateStore(payload).unwrap();
      toast.success(res?.message || "Store updated successfully!");
      onClose();
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to update store details.";
      setApiError(msg);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isUpdating) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUpdating) onClose();
      }}
    >
      <section
        className="admin-dialog admin-dialog-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-store-modal-title"
      >
        <Button
          variant="plain"
          className="modal-close"
          onClick={onClose}
          disabled={isUpdating}
          aria-label="Close"
        >
          <X size={18} />
        </Button>

        <span className="confirm-icon">
          <Store size={22} />
        </span>

        <h2 id="edit-store-modal-title">Edit Store &amp; Branch</h2>
        <p>Update branch contact information, location, and assigned product categories.</p>

        {apiError && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#b91c1c",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "16px",
            }}
          >
            {apiError}
          </div>
        )}

        <form className="entity-form" onSubmit={handleSubmit(onSubmit)}>
          {/* Section 1: Store Branch Information */}
          <div
            style={{
              margin: "12px 0 8px",
              fontWeight: 700,
              fontSize: "13px",
              color: "#166534",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            1. Store Details
          </div>

          <div className="form-grid">
            <label className="full">
              Store / Branch Name *
              <Input
                type="text"
                placeholder="e.g. SFC Bakers - Malviya Nagar"
                {...register("name", { required: "Store name is required" })}
                required
              />
              {errors.name && <small className="error">{errors.name.message}</small>}
            </label>

            <label>
              Business Email
              <Input
                type="email"
                placeholder="branch@sfcbakers.com"
                {...register("email", {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
              />
              {errors.email && <small className="error">{errors.email.message}</small>}
            </label>

            <label>
              Business Phone
              <Input
                type="tel"
                maxLength={10}
                placeholder="9829012345"
                {...register("phone", {
                  validate: (val) =>
                    !val || isValidIndianPhone(val) || "Enter a valid 10-digit Indian phone",
                })}
              />
              {errors.phone && <small className="error">{errors.phone.message}</small>}
            </label>
          </div>

          {/* Location details */}
          <div className="form-grid" style={{ marginTop: "12px" }}>
            <label>
              City
              <Input type="text" placeholder="e.g. Jaipur" {...register("city")} />
            </label>

            <label>
              Pincode
              <Input
                type="text"
                maxLength={6}
                placeholder="e.g. 302017"
                {...register("pincode", {
                  validate: (val) =>
                    !val || /^[1-9]\d{5}$/.test(val) || "Enter a valid 6-digit postal code",
                })}
              />
              {errors.pincode && <small className="error">{errors.pincode.message}</small>}
            </label>

            <label className="full">
              Full Address
              <Input type="text" placeholder="e.g. Ground Floor, Sector 3" {...register("address")} />
            </label>
          </div>

          {/* Delivery Radius & Coverage Coordinates */}
          <div
            style={{
              margin: "20px 0 8px",
              fontWeight: 700,
              fontSize: "13px",
              color: "#166534",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            2. Delivery Radius &amp; Coverage
          </div>

          <div
            style={{
              padding: "14px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <label>
                <span style={{ fontWeight: 700, color: "#166534" }}>Max Delivery Radius (KM) *</span>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="100"
                  placeholder="e.g. 10"
                  {...register("max_delivery_distance", {
                    required: "Delivery radius is required",
                    min: { value: 0.5, message: "Minimum 0.5 km" },
                  })}
                  style={{ background: "#ffffff", fontWeight: 700 }}
                />
              </label>

              <label>
                <span style={{ fontWeight: 600, color: "#374151" }}>Store Latitude</span>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 27.5591"
                  {...register("latitude")}
                  style={{ background: "#ffffff" }}
                />
              </label>

              <label>
                <span style={{ fontWeight: 600, color: "#374151" }}>Store Longitude</span>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 75.2369"
                  {...register("longitude")}
                  style={{ background: "#ffffff" }}
                />
              </label>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "11.5px", color: "#166534" }}>
              💡 Customers within this radius will be serviced by this branch and will see only products deliverable from this store.
            </p>

            {/* Interactive Leaflet Satellite / Street Map with Radius Circle */}
            <div style={{ marginTop: "14px" }}>
              <StoreLocationPicker
                latitude={watchedLatitude}
                longitude={watchedLongitude}
                deliveryRadiusKm={watchedRadius}
                onLocationChange={(newLat, newLng) => {
                  setValue("latitude", newLat, { shouldDirty: true, shouldValidate: true });
                  setValue("longitude", newLng, { shouldDirty: true, shouldValidate: true });
                }}
              />
            </div>
          </div>

          {/* Section 3: Operations & Order Routing */}
          <div
            style={{
              margin: "20px 0 8px",
              fontWeight: 700,
              fontSize: "13px",
              color: "#166534",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            3. Operations &amp; Order Routing
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "10px",
              padding: "12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
          >
            <SettingCheckbox
              key={`store-is-open-${store.id}`}
              id="store-is-open"
              initialChecked={store.is_open ?? true}
              registerProps={register("is_open")}
              color="#166534"
              title="Store Open for Customers"
              description="Customers can browse and place orders for this branch."
            />

            <SettingCheckbox
              key={`store-is-active-${store.id}`}
              id="store-is-active"
              initialChecked={store.is_active ?? true}
              registerProps={register("is_active")}
              color="#166534"
              title="Branch Active in System"
              description="Store owner can log in and manage branch operations."
            />

            <SettingCheckbox
              key={`store-auto-forward-${store.id}`}
              id="store-auto-forward-orders"
              initialChecked={store.auto_forward_orders ?? false}
              registerProps={register("auto_forward_orders")}
              color="#0284c7"
              title="Direct Order Dispatch (Auto-Forward)"
              description="When enabled, incoming orders bypass Admin review and go straight to the Store Owner."
              divider
            />
          </div>

          {/* Section 3: Permitted Product Categories */}
          <div
            style={{
              margin: "20px 0 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: "13px",
                color: "#166534",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Tags size={14} /> 3. Permitted Product Categories ({selectedCategoryIds.length})
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

          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              padding: "10px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: "#f9fafb",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {loadingCategories ? (
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "12px" }}>Loading categories...</p>
            ) : categories.length === 0 ? (
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "12px" }}>No categories available</p>
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
                      padding: "5px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: isSelected ? "1.5px solid #166534" : "1px solid #d1d5db",
                      background: isSelected ? "#f0fdf4" : "#ffffff",
                      color: isSelected ? "#166534" : "#4b5563",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: "13px",
                        height: "13px",
                        borderRadius: "4px",
                        border: isSelected ? "1px solid #166534" : "1px solid #9ca3af",
                        background: isSelected ? "#166534" : "transparent",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {isSelected && <Check size={9} color="#ffffff" strokeWidth={3.5} />}
                    </span>
                    {cat.name}
                  </button>
                );
              })
            )}
          </div>

          <div className="form-actions" style={{ marginTop: "24px" }}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
