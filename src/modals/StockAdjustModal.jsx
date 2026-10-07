import { useState, useEffect } from "react";
import { X, ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { useAdjustIngredientStockMutation } from "../services/inventoryApi";
import { useThrottledCallback } from "../utils/throttle";

export default function StockAdjustModal({ isOpen, onClose, ingredient = null }) {
  const [adjustStock, { isLoading }] = useAdjustIngredientStockMutation();

  const [adjustmentType, setAdjustmentType] = useState("PURCHASE_RESTOCK");
  const [quantity, setQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (ingredient) {
      setAdjustmentType("PURCHASE_RESTOCK");
      setQuantity("");
      setCostPerUnit(
        ingredient.purchase_price !== undefined ? String(ingredient.purchase_price) : ""
      );
      setReason("");
    }
  }, [ingredient, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ingredient) return;
    if (!quantity || Number(quantity) <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a brief reason or reference note");
      return;
    }

    try {
      await adjustStock({
        id: ingredient.id,
        adjustmentType,
        quantity: Number(quantity),
        costPerUnit: costPerUnit ? Number(costPerUnit) : undefined,
        reason: reason.trim(),
      }).unwrap();

      toast.success(`Stock adjusted successfully for ${ingredient.name}`);
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to adjust stock");
    }
  };

  const throttledSubmit = useThrottledCallback(handleSubmit, 2000);

  if (!isOpen || !ingredient) return null;

  const currentStock = Number(ingredient.current_stock || 0);
  const qty = Number(quantity) || 0;

  let delta = 0;
  if (adjustmentType === "PURCHASE_RESTOCK" || adjustmentType === "MANUAL_ADD") {
    delta = qty;
  } else {
    delta = -qty;
  }
  const projectedStock = Math.max(0, Number((currentStock + delta).toFixed(4)));

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 1050 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <section
        className="admin-dialog admin-dialog-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-stock-title"
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
          <ArrowUpDown size={22} />
        </span>

        <h2 id="adjust-stock-title">Adjust Stock: {ingredient.name}</h2>
        <p>
          Current Balance: <strong>{currentStock} {ingredient.base_unit}</strong> • Projected:{" "}
          <strong
            style={{
              color:
                projectedStock <= Number(ingredient.min_stock_threshold || 0)
                  ? "#dc2626"
                  : "#16a34a",
            }}
          >
            {projectedStock} {ingredient.base_unit}
          </strong>
        </p>

        <form className="entity-form" onSubmit={throttledSubmit}>
          <div className="form-grid">
            <label className="full">
              Adjustment Action *
              <Select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
              >
                <option value="PURCHASE_RESTOCK">Restock / Purchase (Adds Stock)</option>
                <option value="MANUAL_ADD">Manual Addition (Count Correction)</option>
                <option value="WASTAGE">Wastage / Spoilage / Damage (Deducts Stock)</option>
                <option value="MANUAL_SUBTRACT">Manual Deduction (Count Correction)</option>
              </Select>
              <small className="muted">Select inventory transaction type</small>
            </label>

            <label>
              Quantity ({ingredient.base_unit}) *
              <Input
                type="number"
                step="any"
                min="0.0001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 10"
                autoFocus
                required
              />
              <small className="muted">Amount of {ingredient.base_unit} changed</small>
            </label>

            <label>
              Cost Per Unit (₹)
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                placeholder="₹0.00"
              />
              <small className="muted">Unit cost for inventory valuation</small>
            </label>

            <label className="full">
              Reason / Audit Note *
              <Input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Received shipment, Kitchen prep loss, etc."
                required
              />
              <small className="muted">Logged permanently into the stock audit trail</small>
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
              Apply Adjustment
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
