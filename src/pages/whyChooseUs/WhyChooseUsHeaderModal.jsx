import { useState, useEffect } from "react";
import { X, Eye } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function WhyChooseUsHeaderModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    badge: "Why Choose Us",
    title: "More Than Just",
    highlight: "Fast Food",
    subtitle: "We believe great food starts with great ingredients, careful preparation and a whole lot of love.",
    cta_text: "Taste The Difference",
    cta_href: "/menu",
  });

  useEffect(() => {
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        badge: initialData.badge || "Why Choose Us",
        title: initialData.title || "More Than Just",
        highlight: initialData.highlight || "Fast Food",
        subtitle: initialData.subtitle || "",
        cta_text: initialData.cta_text || "Taste The Difference",
        cta_href: initialData.cta_href || "/menu",
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
              Edit &quot;Why Choose Us&quot; Header
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Customize the titles, badges, and call-to-action button for this homepage section.
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
                placeholder="e.g. Why Choose Us"
                value={formData.badge}
                onChange={(e) => handleChange("badge", e.target.value)}
                required
              />
              <small className="muted">Small uppercase badge shown at the top</small>
            </label>

            <label>
              Heading Prefix
              <Input
                type="text"
                placeholder="e.g. More Than Just"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                required
              />
              <small className="muted">Main title prefix</small>
            </label>

            <label>
              Highlighted Text
              <Input
                type="text"
                placeholder="e.g. Fast Food"
                value={formData.highlight}
                onChange={(e) => handleChange("highlight", e.target.value)}
              />
              <small className="muted">Text highlighted in brand green</small>
            </label>

            <label className="full">
              Subtitle / Description
              <textarea
                rows={3}
                value={formData.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
                placeholder="Explain what makes your kitchen special..."
              />
              <small className="muted">Section description below title</small>
            </label>

            <label>
              CTA Button Text
              <Input
                type="text"
                placeholder="e.g. Taste The Difference"
                value={formData.cta_text}
                onChange={(e) => handleChange("cta_text", e.target.value)}
              />
              <small className="muted">Button label</small>
            </label>

            <label>
              CTA Button Link
              <Input
                type="text"
                placeholder="e.g. /menu"
                value={formData.cta_href}
                onChange={(e) => handleChange("cta_href", e.target.value)}
              />
              <small className="muted">Page URL destination</small>
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
                background: "#fefcf6",
                border: "1px solid #e7dccb",
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
                  color: "#4f7d16",
                  marginBottom: "6px",
                }}
              >
                {formData.badge || "Why Choose Us"}
              </span>

              <h3 style={{ margin: "0 0 8px", fontSize: "1.35rem", fontWeight: 900, color: "#1e293b" }}>
                {formData.title || "More Than Just"}{" "}
                <span style={{ color: "#4f7d16" }}>{formData.highlight || "Fast Food"}</span>
              </h3>

              <p style={{ margin: "0 auto", fontSize: "0.85rem", color: "#64748b", maxWidth: "420px", lineHeight: 1.5 }}>
                {formData.subtitle || "Section description text..."}
              </p>

              {formData.cta_text && (
                <div style={{ marginTop: "14px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#4f7d16",
                      color: "#ffffff",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      padding: "8px 18px",
                      borderRadius: "10px",
                    }}
                  >
                    {formData.cta_text} →
                  </span>
                </div>
              )}
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
