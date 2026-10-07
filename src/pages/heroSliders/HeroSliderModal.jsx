import { useState, useEffect } from "react";
import {
  X,
  ArrowRight,
  Leaf,
  Eye,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { toAssetUrl } from "../../utils/assetUrl";

export default function HeroSliderModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
  apiError = "",
}) {
  const [formData, setFormData] = useState({
    tag: "FRESH & DELICIOUS",
    title: "",
    highlight: "",
    subtitle: "",
    cta: "Order Now",
    href: "/menu",
    secondary_cta: "View Menu",
    secondary_href: "/menu",
    display_order: 1,
    is_active: true,
  });

  const [imageMode, setImageMode] = useState("file"); // "file" | "url"
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        tag: initialData.tag || "FRESH & DELICIOUS",
        title: initialData.title || "",
        highlight: initialData.highlight || "",
        subtitle: initialData.subtitle || "",
        cta: initialData.cta || "Order Now",
        href: initialData.href || "/menu",
        secondary_cta: initialData.secondary_cta || initialData.secondaryCta || "View Menu",
        secondary_href: initialData.secondary_href || initialData.secondaryHref || "/menu",
        display_order: initialData.display_order ?? 1,
        is_active: initialData.is_active ?? true,
      });

      const initialImg = initialData.image || initialData.img || "";
      if (initialImg) {
        if (/^https?:\/\//i.test(initialImg)) {
          setImageMode("url");
          setImageUrl(initialImg);
        } else {
          setImageMode("file");
        }
        setPreviewUrl(toAssetUrl(initialImg));
      } else {
        setPreviewUrl("");
      }
      setImageFile(null);
    } else {
      setFormData({
        tag: "FRESH & DELICIOUS",
        title: "",
        highlight: "",
        subtitle: "",
        cta: "Order Now",
        href: "/menu",
        secondary_cta: "View Menu",
        secondary_href: "/menu",
        display_order: 1,
        is_active: true,
      });
      setImageMode("file");
      setImageUrl("");
      setImageFile(null);
      setPreviewUrl("");
    }
    setValidationError("");
  }, [initialData, isOpen]);

  // Handle local image file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setValidationError("");
    e.target.value = "";
  };

  // Handle URL change
  const handleUrlChange = (val) => {
    setImageUrl(val);
    if (imageMode === "url") {
      setPreviewUrl(val.trim());
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setValidationError("Slider title is required");
      return;
    }
    if (!formData.highlight.trim()) {
      setValidationError("Slider highlight text is required");
      return;
    }
    if (!imageFile && !previewUrl.trim()) {
      setValidationError("Please select an image file or provide an image URL");
      return;
    }

    // Build payload / FormData
    const data = new FormData();
    data.append("tag", formData.tag.trim());
    data.append("title", formData.title.trim());
    data.append("highlight", formData.highlight.trim());
    data.append("subtitle", formData.subtitle.trim());
    data.append("cta", formData.cta.trim());
    data.append("href", formData.href.trim());
    data.append("secondary_cta", formData.secondary_cta.trim());
    data.append("secondary_href", formData.secondary_href.trim());
    data.append("display_order", Number(formData.display_order) || 1);
    data.append("is_active", formData.is_active);

    if (imageFile) {
      data.append("image", imageFile);
    } else if (imageMode === "url" && imageUrl.trim()) {
      data.append("image", imageUrl.trim());
    } else if (initialData?.image) {
      data.append("image", initialData.image);
    }

    onSubmit(data);
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
          width: "min(860px, calc(100vw - 32px))",
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
            borderBottom: "1px solid var(--border-color, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafafa",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
              {initialData ? "Edit Hero Slider" : "Add New Hero Slider"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Customize background image, titles, subtitle, and CTA buttons.
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

        {/* Scrollable Form Body using common entity-form */}
        <form
          className="entity-form"
          onSubmit={handleSubmit}
          style={{
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Validation & Server Errors */}
          {(validationError || apiError) && (
            <div
              className="error"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.85rem",
              }}
            >
              {validationError || apiError}
            </div>
          )}

          <div className="form-grid">
            <label>
              Badge / Tag
              <Input
                value={formData.tag}
                onChange={(e) => handleChange("tag", e.target.value)}
                placeholder="e.g. FRESH & DELICIOUS"
              />
              <small className="muted">Top pill badge label</small>
            </label>

            <label>
              Display Order
              <Input
                type="number"
                min="1"
                value={formData.display_order}
                onChange={(e) => handleChange("display_order", e.target.value)}
                placeholder="1"
              />
              <small className="muted">Lower numbers appear first</small>
            </label>

            <label>
              Title (Serif Accent) *
              <Input
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="e.g. Good Food,"
                required
              />
              <small className="muted">Displays in italic serif font</small>
            </label>

            <label>
              Highlight (Main Headline) *
              <Input
                value={formData.highlight}
                onChange={(e) => handleChange("highlight", e.target.value)}
                placeholder="e.g. Good Mood."
                required
              />
              <small className="muted">Large bold uppercase title</small>
            </label>

            <label className="full">
              Subtitle / Description
              <textarea
                value={formData.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
                placeholder="Freshly prepared fast food made with quality ingredients..."
                rows={3}
              />
            </label>

            <label>
              Primary Button Label
              <Input
                value={formData.cta}
                onChange={(e) => handleChange("cta", e.target.value)}
                placeholder="e.g. Order Now"
              />
            </label>

            <label>
              Primary Button Link
              <Input
                value={formData.href}
                onChange={(e) => handleChange("href", e.target.value)}
                placeholder="e.g. /menu"
              />
            </label>

            <label>
              Secondary Button Label
              <Input
                value={formData.secondary_cta}
                onChange={(e) => handleChange("secondary_cta", e.target.value)}
                placeholder="e.g. View Menu"
              />
            </label>

            <label>
              Secondary Button Link
              <Input
                value={formData.secondary_href}
                onChange={(e) => handleChange("secondary_href", e.target.value)}
                placeholder="e.g. /menu or /about"
              />
            </label>

            <label>
              Status
              <Select
                value={formData.is_active ? "true" : "false"}
                onChange={(e) => handleChange("is_active", e.target.value === "true")}
              >
                <option value="true">Active (Visible)</option>
                <option value="false">Inactive (Hidden)</option>
              </Select>
            </label>

            <label>
              Image Source Mode
              <Select
                value={imageMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setImageMode(mode);
                  if (mode === "url" && imageUrl) setPreviewUrl(imageUrl.trim());
                  if (mode === "file" && imageFile) setPreviewUrl(URL.createObjectURL(imageFile));
                }}
              >
                <option value="file">Upload File</option>
                <option value="url">Direct Image URL</option>
              </Select>
            </label>

            <label className="full">
              Background Image *
              {imageMode === "file" ? (
                <div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleFileChange}
                  />
                  <small className="muted" style={{ display: "block", marginTop: "6px" }}>
                    Recommended: 1400×700 or high-resolution JPG, PNG, WEBP (Max 10 MB).
                  </small>
                </div>
              ) : (
                <div>
                  <Input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                  <small className="muted" style={{ display: "block", marginTop: "6px" }}>
                    Direct link to public image (Unsplash, CDN, or Cloudinary).
                  </small>
                </div>
              )}
            </label>
          </div>

          {/* Row 6: Live Hero Slide Preview */}
          {previewUrl && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
                <Eye size={15} /> Live Slide Preview
              </div>

              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "220px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#1c1917",
                }}
              >
                {/* Background Image */}
                <img
                  src={previewUrl}
                  alt="Slide preview"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                {/* Overlays */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.5), rgba(0,0,0,0.2))",
                  }}
                />

                {/* Content Overlay */}
                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    padding: "20px 24px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    maxWidth: "70%",
                  }}
                >
                  {/* Tag */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      background: "rgba(255,255,255,0.18)",
                      backdropFilter: "blur(4px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "999px",
                      padding: "3px 8px",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: "#ffffff",
                      letterSpacing: "0.08em",
                      width: "fit-content",
                      marginBottom: "6px",
                    }}
                  >
                    <Leaf size={10} style={{ color: "#4f7d16" }} />
                    {formData.tag || "TAG"}
                  </div>

                  {/* Title & Highlight */}
                  <div style={{ lineHeight: 1.1 }}>
                    <span
                      style={{
                        fontFamily: "serif",
                        fontStyle: "italic",
                        fontSize: "1.1rem",
                        color: "#e2b842",
                        display: "block",
                      }}
                    >
                      {formData.title || "Good Food,"}
                    </span>
                    <span
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 900,
                        color: "#ffffff",
                        textTransform: "uppercase",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {formData.highlight || "Good Mood."}
                    </span>
                  </div>

                  {/* Subtitle */}
                  {formData.subtitle && (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: "0.75rem",
                        color: "rgba(255,255,255,0.85)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {formData.subtitle}
                    </p>
                  )}

                  {/* Buttons Mockup */}
                  <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                    <div
                      style={{
                        background: "#4f7d16",
                        color: "#ffffff",
                        padding: "5px 12px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {formData.cta || "Order Now"} <ArrowRight size={12} />
                    </div>
                    {formData.secondary_cta && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.2)",
                          color: "#ffffff",
                          border: "1px solid rgba(255,255,255,0.3)",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        {formData.secondary_cta}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : initialData
                ? "Save Changes"
                : "Create Slider"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

