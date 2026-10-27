import { useState, useEffect } from "react";
import { X, Eye } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function TestimonialHeaderModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    badge: "Customer Love",
    title: "What Our Customers Say",
    subtitle: "Real feedback from genuine food lovers who order from us regularly.",
  });

  useEffect(() => {
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        badge: initialData.badge || "Customer Love",
        title: initialData.title || "What Our Customers Say",
        subtitle: initialData.subtitle || "",
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "min(640px, calc(100vw - 32px))",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafafa",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
              Edit &quot;Customer Love&quot; Header
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Customize the section badge, main heading, and subtitle for the testimonials slider.
            </p>
          </div>
          <Button
            variant="plain"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            style={{ padding: "6px", borderRadius: "8px" }}
          >
            <X size={19} />
          </Button>
        </div>

        {/* Form Body using common entity-form */}
        <form
          className="entity-form"
          onSubmit={handleSubmit}
          style={{
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div className="form-grid">
            <label className="full">
              Section Badge Label
              <Input
                type="text"
                placeholder="e.g. Customer Love"
                value={formData.badge}
                onChange={(e) => handleChange("badge", e.target.value)}
                required
              />
              <small className="muted">Small top label shown above heading</small>
            </label>

            <label className="full">
              Section Main Heading
              <Input
                type="text"
                placeholder="e.g. What Our Customers Say"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                required
              />
              <small className="muted">Primary headline of the reviews section</small>
            </label>

            <label className="full">
              Subtitle / Description
              <textarea
                rows={3}
                value={formData.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
                placeholder="Real feedback from genuine food lovers..."
              />
              <small className="muted">Explanatory text under heading</small>
            </label>
          </div>

          {/* Live Header Preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
              <Eye size={15} /> Storefront Header Preview
            </div>

            <div
              style={{
                padding: "20px",
                borderRadius: "14px",
                background: "#fafaf9",
                border: "1px solid #e7e5e4",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#d97706",
                  marginBottom: "6px",
                }}
              >
                {formData.badge || "Customer Love"}
              </span>

              <h3 style={{ margin: "0 0 8px", fontSize: "1.35rem", fontWeight: 900, color: "#1e293b" }}>
                {formData.title || "What Our Customers Say"}
              </h3>

              <p style={{ margin: "0 auto", fontSize: "0.85rem", color: "#64748b", maxWidth: "420px", lineHeight: 1.5 }}>
                {formData.subtitle || "Real feedback from genuine food lovers who order from us regularly."}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "14px",
              borderTop: "1px solid #e2e8f0",
              marginTop: "6px",
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Header Settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
