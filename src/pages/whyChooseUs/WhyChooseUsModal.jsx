import { useState, useEffect } from "react";
import { X, Leaf, Eye } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { toAssetUrl } from "../../utils/assetUrl";
import { ICON_MAP } from "./iconMap";

export default function WhyChooseUsModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
  apiError = "",
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "Leaf",
    color_class: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
    display_order: 1,
    is_active: true,
  });

  const [imageMode, setImageMode] = useState("icon"); // "icon" | "file" | "url"
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        icon: initialData.icon || "Leaf",
        color_class: initialData.color_class || "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
        display_order: initialData.display_order ?? 1,
        is_active: initialData.is_active ?? true,
      });

      const initialImg = initialData.image || "";
      if (initialImg) {
        if (/^https?:\/\//i.test(initialImg)) {
          setImageMode("url");
          setImageUrl(initialImg);
        } else {
          setImageMode("file");
        }
        setPreviewUrl(toAssetUrl(initialImg));
      } else {
        setImageMode("icon");
        setPreviewUrl("");
      }
      setImageFile(null);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        title: "",
        description: "",
        icon: "Leaf",
        color_class: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
        display_order: 1,
        is_active: true,
      });
      setImageMode("icon");
      setImageUrl("");
      setImageFile(null);
      setPreviewUrl("");
    }
    setValidationError("");
  }, [initialData, isOpen]);

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
      setValidationError("Feature title is required");
      return;
    }
    if (!formData.description.trim()) {
      setValidationError("Description is required");
      return;
    }

    const data = new FormData();
    data.append("title", formData.title.trim());
    data.append("description", formData.description.trim());
    data.append("icon", formData.icon);
    data.append("color_class", formData.color_class);
    data.append("display_order", Number(formData.display_order) || 1);
    data.append("is_active", formData.is_active);

    if (imageMode === "file" && imageFile) {
      data.append("image", imageFile);
    } else if (imageMode === "url" && imageUrl.trim()) {
      data.append("imageUrl", imageUrl.trim());
    } else if (imageMode === "icon") {
      data.append("imageUrl", ""); // clear custom image if switched back to icon
    } else if (initialData?.image) {
      data.append("imageUrl", initialData.image);
    }

    onSubmit(data);
  };

  if (!isOpen) return null;

  const ActiveIcon = ICON_MAP[formData.icon] || Leaf;

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
          width: "min(680px, calc(100vw - 32px))",
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
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
              {initialData ? "Edit Feature" : "Add New Feature"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Configure icon, title, description, and display order for &quot;Why Choose Us&quot;.
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
              Feature Title *
              <Input
                type="text"
                placeholder="e.g. Fresh Ingredients"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                required
              />
              <small className="muted">Primary feature headline</small>
            </label>

            <label>
              Display Order
              <Input
                type="number"
                min="1"
                value={formData.display_order}
                onChange={(e) => handleChange("display_order", e.target.value)}
              />
              <small className="muted">Order index (1, 2, 3...)</small>
            </label>

            <label className="full">
              Description *
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Explain why customers love this feature..."
                required
              />
              <small className="muted">Short explanatory paragraph</small>
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
              Icon / Image Source
              <Select
                value={imageMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setImageMode(mode);
                  if (mode === "url" && imageUrl) setPreviewUrl(imageUrl.trim());
                  if (mode === "file" && imageFile) setPreviewUrl(URL.createObjectURL(imageFile));
                  if (mode === "icon") setPreviewUrl("");
                }}
              >
                <option value="icon">Lucide Icon (Recommended)</option>
                <option value="file">Upload Custom Icon/Image</option>
                <option value="url">Direct Image URL</option>
              </Select>
            </label>

            {/* Icon Picker Grid */}
            {imageMode === "icon" && (
              <div className="full" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#505064" }}>
                  Select Icon ({Object.keys(ICON_MAP).length} available)
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(62px, 1fr))",
                    gap: "8px",
                    maxHeight: "160px",
                    overflowY: "auto",
                    padding: "8px",
                    border: "1px solid #dedde6",
                    borderRadius: "8px",
                    background: "#fcfcfd",
                  }}
                >
                  {Object.entries(ICON_MAP).map(([iconKey, Icon]) => {
                    const isSelected = formData.icon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => handleChange("icon", iconKey)}
                        title={iconKey}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          padding: "8px 4px",
                          borderRadius: "8px",
                          border: isSelected ? "1.5px solid #4f7d16" : "1px solid #e2e8f0",
                          background: isSelected ? "rgba(79, 125, 22, 0.1)" : "#ffffff",
                          color: isSelected ? "#4f7d16" : "#475569",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon size={18} />
                        <span style={{ fontSize: "9px", fontWeight: isSelected ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", maxWidth: "52px", whiteSpace: "nowrap" }}>
                          {iconKey}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Image File Upload */}
            {imageMode === "file" && (
              <label className="full">
                Custom Icon File
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                />
                <small className="muted">Upload a transparent PNG, SVG, or WEBP (Max 5 MB)</small>
              </label>
            )}

            {/* Custom Direct URL */}
            {imageMode === "url" && (
              <label className="full">
                Custom Icon Image URL
                <Input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                />
                <small className="muted">Direct web link to image asset</small>
              </label>
            )}
          </div>

          {/* Live Feature Preview Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
              <Eye size={15} /> Storefront Card Preview
            </div>

            <div
              style={{
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                padding: "18px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                maxWidth: "280px",
                margin: "0 auto",
                boxShadow: "0 8px 20px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "12px",
                  background: "rgba(79, 125, 22, 0.12)",
                  color: "#4f7d16",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                }}
              >
                {imageMode !== "icon" && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ width: "32px", height: "32px", objectFit: "contain" }}
                  />
                ) : (
                  <ActiveIcon size={24} />
                )}
              </div>

              <h4 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>
                {formData.title || "Feature Title"}
              </h4>

              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>
                {formData.description || "Feature description will appear here..."}
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
              {isSubmitting
                ? "Saving..."
                : initialData
                ? "Save Changes"
                : "Create Feature"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
