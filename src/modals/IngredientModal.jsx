import { useState, useEffect } from "react";
import { X, Plus, Boxes } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import {
  useCreateIngredientMutation,
  useUpdateIngredientMutation,
  useGetSuppliersQuery,
} from "../services/inventoryApi";
import SupplierModal from "./SupplierModal";
import { useThrottledCallback } from "../utils/throttle";

const COMMON_CATEGORIES = [
  "Bakery",
  "Dairy & Cheese",
  "Sauces & Condiments",
  "Produce & Veggies",
  "Meat & Patties",
  "Oils & Fats",
  "Spices & Seasonings",
  "Beverages & Syrups",
  "Packaging & Disposables",
  "General",
];

const BASE_UNITS = [
  { label: "Piece (pc / count)", value: "piece" },
  { label: "Gram (g)", value: "gram" },
  { label: "Kilogram (kg)", value: "kg" },
  { label: "Millilitre (ml)", value: "ml" },
  { label: "Litre (L)", value: "litre" },
];

export default function IngredientModal({
  isOpen,
  onClose,
  ingredient = null,
  onSuccess = null,
}) {
  const [createIngredient, { isLoading: isCreating }] = useCreateIngredientMutation();
  const [updateIngredient, { isLoading: isUpdating }] = useUpdateIngredientMutation();

  const { data: suppliersData } = useGetSuppliersQuery({ limit: 100 });
  const suppliers = suppliersData?.data || [];

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "Bakery",
    base_unit: "piece",
    supplier_id: "",
    current_stock: "",
    min_stock_threshold: "",
    purchase_price: "",
    restore_stock_on_cancel: true,
    batch_number: "",
    expiry_date: "",
    is_active: true,
  });

  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name || "",
        category: ingredient.category || "General",
        base_unit: ingredient.base_unit || "piece",
        supplier_id: ingredient.supplier_id ? String(ingredient.supplier_id) : "",
        current_stock:
          ingredient.current_stock !== undefined ? String(ingredient.current_stock) : "",
        min_stock_threshold:
          ingredient.min_stock_threshold !== undefined
            ? String(ingredient.min_stock_threshold)
            : "",
        purchase_price:
          ingredient.purchase_price !== undefined ? String(ingredient.purchase_price) : "",
        restore_stock_on_cancel:
          ingredient.restore_stock_on_cancel !== undefined
            ? Boolean(ingredient.restore_stock_on_cancel)
            : true,
        batch_number: ingredient.batch_number || "",
        expiry_date: ingredient.expiry_date ? ingredient.expiry_date.split("T")[0] : "",
        is_active: ingredient.is_active !== undefined ? Boolean(ingredient.is_active) : true,
      });
    } else {
      setFormData({
        name: "",
        category: "Bakery",
        base_unit: "piece",
        supplier_id: "",
        current_stock: "0",
        min_stock_threshold: "5",
        purchase_price: "0",
        restore_stock_on_cancel: true,
        batch_number: "",
        expiry_date: "",
        is_active: true,
      });
    }
    setErrorMsg("");
  }, [ingredient, isOpen]);

  const isEdit = Boolean(ingredient?.id);
  const isLoading = isCreating || isUpdating;

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errorMsg) setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Ingredient name is required");
      return;
    }
    if (!formData.base_unit) {
      setErrorMsg("Base unit is required");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        base_unit: formData.base_unit,
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
        min_stock_threshold: Number(formData.min_stock_threshold || 0),
        purchase_price: Number(formData.purchase_price || 0),
        restore_stock_on_cancel: Boolean(formData.restore_stock_on_cancel),
        batch_number: formData.batch_number.trim() || null,
        expiry_date: formData.expiry_date || null,
        is_active: Boolean(formData.is_active),
      };

      if (!isEdit) {
        payload.current_stock = Number(formData.current_stock || 0);
        const res = await createIngredient(payload).unwrap();
        toast.success("Ingredient created successfully");
        if (onSuccess) onSuccess(res.data);
      } else {
        const res = await updateIngredient({ id: ingredient.id, ...payload }).unwrap();
        toast.success("Ingredient updated successfully");
        if (onSuccess) onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      const msg = err?.data?.message || "Failed to save ingredient";
      setErrorMsg(msg);
    }
  };

  const handleSupplierCreated = (newSupplier) => {
    if (newSupplier?.id) {
      setFormData((prev) => ({ ...prev, supplier_id: String(newSupplier.id) }));
    }
  };

  const throttledSubmit = useThrottledCallback(handleSubmit, 2000);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal-backdrop"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !isLoading) onClose();
        }}
      >
        <section
          className="admin-dialog admin-dialog-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ingredient-modal-title"
        >
          <Button
            variant="plain"
            className="modal-close"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
          >
            <X size={18} />
          </Button>

          <span className="confirm-icon">
            <Boxes size={22} />
          </span>

          <h2 id="ingredient-modal-title">
            {isEdit ? "Edit Raw Material" : "Add Raw Material / Ingredient"}
          </h2>
          <p>
            Configure recipe ingredient details, alert thresholds, and cancellation restock policy.
          </p>

          {errorMsg && <div className="confirm-error">{errorMsg}</div>}

          <form className="entity-form" onSubmit={throttledSubmit}>
            <div className="form-grid">
              <label className="full">
                Raw Material / Ingredient Name *
                <Input
                  type="text"
                  placeholder="e.g. Burger Bun, Cheese Slice, Mayonnaise, Cooking Oil"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  autoFocus
                />
                <small className="muted">Primary name of the raw material or ingredient</small>
              </label>

              <label>
                Category
                <Input
                  type="text"
                  list="category-suggestions"
                  placeholder="e.g. Bakery, Dairy, Sauces"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                />
                <datalist id="category-suggestions">
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                <small className="muted">Inventory category group</small>
              </label>

              <label>
                Base Inventory Unit *
                <Select
                  value={formData.base_unit}
                  onChange={(e) => handleChange("base_unit", e.target.value)}
                >
                  {BASE_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </Select>
                <small className="muted">Measurement unit for recipes and stock</small>
              </label>

              <label className="full">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Supplier / Vendor</span>
                  <Button
                    variant="text"
                    onClick={() => setIsSupplierModalOpen(true)}
                  >
                    <Plus size={13} /> Add Supplier
                  </Button>
                </div>
                <Select
                  value={formData.supplier_id}
                  onChange={(e) => handleChange("supplier_id", e.target.value)}
                >
                  <option value="">-- No Supplier Assigned --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.contact_person ? `(${s.contact_person})` : ""}
                    </option>
                  ))}
                </Select>
              </label>

              {!isEdit && (
                <label>
                  Initial Stock ({formData.base_unit})
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={formData.current_stock}
                    onChange={(e) => handleChange("current_stock", e.target.value)}
                  />
                  <small className="muted">Opening balance in inventory</small>
                </label>
              )}

              <label>
                Low Stock Alert Limit ({formData.base_unit}) *
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 5"
                  value={formData.min_stock_threshold}
                  onChange={(e) => handleChange("min_stock_threshold", e.target.value)}
                  required
                />
                <small className="muted">Triggers alert when stock reaches this level</small>
              </label>

              <label>
                Cost Per {formData.base_unit} (₹)
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="₹0.00"
                  value={formData.purchase_price}
                  onChange={(e) => handleChange("purchase_price", e.target.value)}
                />
                <small className="muted">Purchase price used in product recipe costing</small>
              </label>

              <label>
                Status
                <Select
                  value={formData.is_active ? "true" : "false"}
                  onChange={(e) => handleChange("is_active", e.target.value === "true")}
                >
                  <option value="true">Active (In Use)</option>
                  <option value="false">Inactive (Disabled)</option>
                </Select>
                <small className="muted">Active items can be used in product recipes</small>
              </label>

              <label>
                Batch / Lot Number (Optional)
                <Input
                  type="text"
                  placeholder="e.g. LOT-2026-B1"
                  value={formData.batch_number}
                  onChange={(e) => handleChange("batch_number", e.target.value)}
                />
                <small className="muted">Batch identification code</small>
              </label>

              <label>
                Expiry Date (Optional)
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => handleChange("expiry_date", e.target.value)}
                />
                <small className="muted">Perishable shelf-life expiration date</small>
              </label>

              <label className="full">
                Cancellation Restock Policy *
                <Select
                  value={formData.restore_stock_on_cancel ? "true" : "false"}
                  onChange={(e) => handleChange("restore_stock_on_cancel", e.target.value === "true")}
                >
                  <option value="true">✓ Restorable on Cancel (e.g. Burger Buns, Cheese Slices, Raw Patties)</option>
                  <option value="false">✗ Non-Restorable / Consumed in Prep (e.g. Cooking Oil, Mixed Sauces)</option>
                </Select>
                <small className="muted">
                  {formData.restore_stock_on_cancel
                    ? "When an order is cancelled or refunded, consumed stock of this item will be returned to inventory."
                    : "When an order is cancelled or refunded, stock will NOT be restored because this item was consumed during cooking/prep."}
                </small>
              </label>
            </div>

            <div className="confirm-actions">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                loading={isLoading}
              >
                {isEdit ? "Save Changes" : "Create Ingredient"}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={handleSupplierCreated}
      />
    </>
  );
}
